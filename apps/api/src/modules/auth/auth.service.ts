import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import type { UserModel } from "../../generated/prisma/models.js";
import { AppConfigService } from "../config/app-config.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { UsersService } from "../users/users.service.js";
import type { AuthResponseDto } from "./dto/auth-response.dto.js";
import type { LoginDto } from "./dto/login.dto.js";
import type { RegisterDto } from "./dto/register.dto.js";
import { GitHubAccountService } from "./providers/github-account.service.js";
import { GitHubOAuthProvider } from "./providers/github-oauth.provider.js";
import type { AccessTokenPayload, RefreshTokenPayload } from "./types/jwt-payload.js";

type SessionMetadata = {
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

type UserWithGitHubAccount = UserModel & {
  githubAccount: {
    avatarUrl: string | null;
    displayName: string | null;
    login: string;
  } | null;
};

const PASSWORD_SALT_ROUNDS = 12;
const GITHUB_OAUTH_STATE_TTL_SECONDS = 600;
const GITHUB_OAUTH_NONCE_BYTES = 32;

@Injectable()
export class AuthService {
  constructor(
    @Inject(AppConfigService)
    private readonly config: AppConfigService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(GitHubOAuthProvider)
    private readonly githubOAuthProvider: GitHubOAuthProvider,
    @Inject(GitHubAccountService)
    private readonly githubAccountService: GitHubAccountService
  ) {}

  get webAuthCallbackUrl() {
    return this.config.webAuthCallbackUrl;
  }

  createGitHubOAuthNonce(): string {
    return randomBytes(GITHUB_OAUTH_NONCE_BYTES).toString("base64url");
  }

  async createGitHubAuthorizationUrl(nonce: string): Promise<string> {
    const state = await this.jwtService.signAsync(
      {
        nonceHash: this.hashToken(nonce),
        type: "github_oauth_state"
      },
      {
        secret: this.config.jwtAccessSecret,
        expiresIn: GITHUB_OAUTH_STATE_TTL_SECONDS
      }
    );

    return this.githubOAuthProvider.buildAuthorizationUrl(state);
  }

  async loginWithGitHub(
    code: string,
    state: string,
    stateCookieNonce: string | null,
    metadata: SessionMetadata
  ): Promise<AuthResponseDto> {
    await this.verifyGitHubOAuthState(state, stateCookieNonce);

    const profile = await this.githubOAuthProvider.exchangeCodeForProfile(code);
    const existingGitHubAccount = await this.prisma.gitHubAccount.findUnique({
      where: { githubId: profile.githubId },
      include: { user: true }
    });
    const user =
      existingGitHubAccount?.user ??
      (await this.usersService.findByEmail(profile.email)) ??
      (await this.usersService.createOAuthUser({
        email: profile.email
      }));

    await this.githubAccountService.upsert({
      userId: user.id,
      avatarUrl: profile.avatarUrl,
      displayName: profile.displayName,
      githubId: profile.githubId,
      login: profile.login,
      scope: profile.scope,
      accessToken: profile.accessToken
    });

    return this.createSession(user, metadata);
  }

  async register(dto: RegisterDto, metadata: SessionMetadata): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException("Unable to register with the provided credentials");
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.usersService.createWithPassword({
      email: dto.email,
      passwordHash
    });

    return this.createSession(user, metadata);
  }

  async login(dto: LoginDto, metadata: SessionMetadata): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.createSession(user, metadata);
  }

  async refresh(refreshToken: string, metadata: SessionMetadata): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true }
    });

    if (
      !existingToken ||
      existingToken.tokenHash !== tokenHash ||
      existingToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (existingToken.revokedAt) {
      await this.revokeRefreshTokenFamily(existingToken);
      throw new UnauthorizedException("Invalid refresh token");
    }

    const now = new Date();
    const nextRefreshTokenId = randomUUID();
    const familyId = existingToken.familyId;
    const tokens = await this.signTokens(existingToken.user, nextRefreshTokenId);
    const nextTokenHash = this.hashToken(tokens.refreshToken);

    const rotation = await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.refreshToken.updateMany({
        where: {
          id: existingToken.id,
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now }
        },
        data: {
          revokedAt: now,
          replacedByTokenId: nextRefreshTokenId
        }
      });

      if (consumed.count !== 1) {
        return { consumed: false };
      }

      await transaction.refreshToken.create({
        data: {
          id: nextRefreshTokenId,
          tokenHash: nextTokenHash,
          familyId,
          user: { connect: { id: existingToken.userId } },
          userAgent: metadata.userAgent ?? null,
          ipAddress: metadata.ipAddress ?? null,
          expiresAt: this.refreshTokenExpiresAt()
        }
      });

      return { consumed: true };
    });

    if (!rotation.consumed) {
      await this.revokeRefreshTokenFamily(existingToken);
      throw new UnauthorizedException("Invalid refresh token");
    }

    return {
      user: this.toUserResponse(existingToken.user),
      tokens
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken).catch(() => null);

    if (!payload) {
      return;
    }

    await this.prisma.refreshToken
      .update({
        where: { id: payload.jti },
        data: { revokedAt: new Date() }
      })
      .catch(() => undefined);
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        githubAccount: {
          select: {
            avatarUrl: true,
            displayName: true,
            login: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    return this.toUserResponse(user);
  }

  private async createSession(
    user: UserModel,
    metadata: SessionMetadata
  ): Promise<AuthResponseDto> {
    const refreshTokenId = randomUUID();
    const tokens = await this.signTokens(user, refreshTokenId);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        tokenHash: this.hashToken(tokens.refreshToken),
        familyId: refreshTokenId,
        user: { connect: { id: user.id } },
        userAgent: metadata.userAgent ?? null,
        ipAddress: metadata.ipAddress ?? null,
        expiresAt: this.refreshTokenExpiresAt()
      }
    });

    return {
      user: this.toUserResponse(user),
      tokens
    };
  }

  private async signTokens(user: UserModel, refreshTokenId: string) {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshTokenId,
      type: "refresh"
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.config.jwtAccessSecret,
        expiresIn: this.config.jwtAccessTokenTtlSeconds
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshTokenTtlSeconds
      })
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtAccessTokenTtlSeconds
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    const payload = await this.jwtService
      .verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.jwtRefreshSecret
      })
      .catch(() => null);

    if (payload?.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return payload;
  }

  private async verifyGitHubOAuthState(state: string, stateCookieNonce: string | null) {
    const payload = await this.jwtService
      .verifyAsync<{ nonceHash?: string; type?: string }>(state, {
        secret: this.config.jwtAccessSecret
      })
      .catch(() => null);

    if (
      payload?.type !== "github_oauth_state" ||
      typeof payload.nonceHash !== "string" ||
      !stateCookieNonce ||
      !this.hashesMatch(payload.nonceHash, this.hashToken(stateCookieNonce))
    ) {
      throw new UnauthorizedException("Invalid GitHub OAuth state");
    }
  }

  private refreshTokenExpiresAt() {
    return new Date(Date.now() + this.config.jwtRefreshTokenTtlSeconds * 1000);
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private hashesMatch(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private async revokeRefreshTokenFamily(token: {
    familyId: string;
    id: string;
    userId: string;
  }): Promise<void> {
    const now = new Date();

    await this.prisma.refreshToken.updateMany({
      where: {
        userId: token.userId,
        OR: [{ familyId: token.familyId }, { id: token.familyId }]
      },
      data: { revokedAt: now }
    });
  }

  private toUserResponse(user: UserModel | UserWithGitHubAccount) {
    return {
      id: user.id,
      email: user.email,
      github:
        "githubAccount" in user && user.githubAccount
          ? {
              avatarUrl: user.githubAccount.avatarUrl,
              displayName: user.githubAccount.displayName,
              username: user.githubAccount.login
            }
          : null,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: user.createdAt
    };
  }
}
