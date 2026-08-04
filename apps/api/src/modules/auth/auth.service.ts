import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { createHash, randomUUID } from "node:crypto";

import type { UserModel } from "../../generated/prisma/models.js";
import { AppConfigService } from "../config/app-config.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { UsersService } from "../users/users.service.js";
import type { AuthResponseDto } from "./dto/auth-response.dto.js";
import type { LoginDto } from "./dto/login.dto.js";
import type { RegisterDto } from "./dto/register.dto.js";
import type { AccessTokenPayload, RefreshTokenPayload } from "./types/jwt-payload.js";

type SessionMetadata = {
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

const PASSWORD_SALT_ROUNDS = 12;

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
    private readonly usersService: UsersService
  ) {}

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

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.createSession(user, metadata);
  }

  async refresh(refreshToken: string, metadata: SessionMetadata): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true }
    });

    if (
      !storedToken ||
      storedToken.tokenHash !== tokenHash ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const nextRefreshTokenId = randomUUID();
    const tokens = await this.signTokens(storedToken.user, nextRefreshTokenId);
    const nextTokenHash = this.hashToken(tokens.refreshToken);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: nextRefreshTokenId
        }
      }),
      this.prisma.refreshToken.create({
        data: {
          id: nextRefreshTokenId,
          tokenHash: nextTokenHash,
          user: { connect: { id: storedToken.userId } },
          userAgent: metadata.userAgent ?? null,
          ipAddress: metadata.ipAddress ?? null,
          expiresAt: this.refreshTokenExpiresAt()
        }
      })
    ]);

    return {
      user: this.toUserResponse(storedToken.user),
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
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
      secret: this.config.jwtRefreshSecret
    });

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return payload;
  }

  private refreshTokenExpiresAt() {
    return new Date(Date.now() + this.config.jwtRefreshTokenTtlSeconds * 1000);
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private toUserResponse(user: UserModel) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: user.createdAt
    };
  }
}
