import { UnauthorizedException } from "@nestjs/common";
import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service.js";

const user = {
  id: "user_1",
  email: "founder@example.com",
  passwordHash: "hash",
  role: "USER",
  tenantId: null,
  createdAt: new Date("2026-09-02T10:00:00.000Z"),
  updatedAt: new Date("2026-09-02T10:00:00.000Z")
};

function createService(overrides?: {
  prisma?: Record<string, unknown>;
  jwtService?: Record<string, unknown>;
  usersService?: Record<string, unknown>;
  githubOAuthProvider?: Record<string, unknown>;
  githubAccountService?: Record<string, unknown>;
}) {
  const config = {
    jwtAccessSecret: "access-secret-at-least-32-characters",
    jwtAccessTokenTtlSeconds: 7200,
    jwtRefreshSecret: "refresh-secret-at-least-32-characters",
    jwtRefreshTokenTtlSeconds: 2_592_000,
    webAuthCallbackUrl: "http://localhost:5173/auth/callback"
  };
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue("signed-token"),
    verifyAsync: vi.fn().mockResolvedValue({
      jti: "refresh_1",
      sub: "user_1",
      type: "refresh"
    }),
    ...overrides?.jwtService
  };
  const refreshToken = {
    id: "refresh_1",
    tokenHash: "hash",
    familyId: "family_1",
    userId: "user_1",
    userAgent: null,
    ipAddress: null,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedByTokenId: null,
    createdAt: new Date(),
    user
  };
  const tx = {
    refreshToken: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({})
    }
  };
  const prisma = {
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(refreshToken),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    ...overrides?.prisma
  };
  const githubOAuthProvider = {
    buildAuthorizationUrl: vi.fn().mockReturnValue("https://github.com/login/oauth"),
    ...overrides?.githubOAuthProvider
  };
  const service = new AuthService(
    config as never,
    jwtService as never,
    prisma as never,
    (overrides?.usersService ?? {}) as never,
    githubOAuthProvider as never,
    (overrides?.githubAccountService ?? {}) as never
  );

  return { githubOAuthProvider, jwtService, prisma, refreshToken, service, tx };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

describe("AuthService security hardening", () => {
  it("binds signed GitHub OAuth state to the provided nonce", async () => {
    const { jwtService, service } = createService();

    await service.createGitHubAuthorizationUrl("browser-nonce");

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        nonceHash: sha256("browser-nonce"),
        type: "github_oauth_state"
      },
      expect.objectContaining({
        expiresIn: 600,
        secret: "access-secret-at-least-32-characters"
      })
    );
  });

  it("rejects a missing GitHub OAuth state cookie nonce", async () => {
    const { service } = createService({
      jwtService: {
        verifyAsync: vi.fn().mockResolvedValue({
          nonceHash: sha256("browser-nonce"),
          type: "github_oauth_state"
        })
      }
    });

    await expect(
      service.loginWithGitHub("code", "state", null, {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a mismatched GitHub OAuth state cookie nonce", async () => {
    const { service } = createService({
      jwtService: {
        verifyAsync: vi.fn().mockResolvedValue({
          nonceHash: sha256("browser-nonce"),
          type: "github_oauth_state"
        })
      }
    });

    await expect(
      service.loginWithGitHub("code", "state", "other-nonce", {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an expired GitHub OAuth state", async () => {
    const { service } = createService({
      jwtService: {
        verifyAsync: vi.fn().mockRejectedValue(new Error("jwt expired"))
      }
    });

    await expect(
      service.loginWithGitHub("code", "state", "browser-nonce", {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("accepts a valid signed GitHub OAuth state with a matching state cookie nonce", async () => {
    const profile = {
      accessToken: "github-token",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
      displayName: "Founder",
      email: "founder@example.com",
      githubId: "123",
      login: "founder",
      scope: "repo read:user user:email"
    };
    const { service } = createService({
      jwtService: {
        signAsync: vi
          .fn()
          .mockResolvedValueOnce("access-token")
          .mockResolvedValueOnce("refresh-token"),
        verifyAsync: vi.fn().mockResolvedValue({
          nonceHash: sha256("browser-nonce"),
          type: "github_oauth_state"
        })
      },
      prisma: {
        gitHubAccount: {
          findUnique: vi.fn().mockResolvedValue(null)
        },
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn()
        }
      },
      usersService: {
        createOAuthUser: vi.fn().mockResolvedValue(user),
        findByEmail: vi.fn().mockResolvedValue(null)
      },
      githubOAuthProvider: {
        exchangeCodeForProfile: vi.fn().mockResolvedValue(profile)
      },
      githubAccountService: {
        upsert: vi.fn().mockResolvedValue(undefined)
      }
    });

    await expect(
      service.loginWithGitHub("code", "state", "browser-nonce", {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      })
    ).resolves.toMatchObject({
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token"
      },
      user: {
        email: "founder@example.com"
      }
    });
  });

  it("rotates a refresh token with an atomic consume before creating the successor", async () => {
    const refreshToken = "refresh-token-value";
    const tokenHash = sha256(refreshToken);
    const { prisma, service, tx } = createService({
      prisma: {
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue({
            id: "refresh_1",
            tokenHash,
            familyId: "family_1",
            userId: "user_1",
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
            user
          }),
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        }
      }
    });

    await service.refresh(refreshToken, {
      ipAddress: "127.0.0.1",
      userAgent: "vitest"
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "refresh_1",
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) }
      },
      data: {
        revokedAt: expect.any(Date),
        replacedByTokenId: expect.any(String)
      }
    });
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        familyId: "family_1",
        tokenHash: expect.any(String)
      })
    });
  });

  it("rejects concurrent reuse when the atomic consume finds no active token", async () => {
    const refreshToken = "refresh-token-value";
    const tokenHash = sha256(refreshToken);
    const { prisma, service, tx } = createService({
      prisma: {
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue({
            id: "refresh_1",
            tokenHash,
            familyId: "family_1",
            userId: "user_1",
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
            user
          }),
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        }
      }
    });

    tx.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refresh(refreshToken, {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        OR: [{ familyId: "family_1" }, { id: "family_1" }]
      },
      data: { revokedAt: expect.any(Date) }
    });
  });

  it("revokes the token family when an already revoked refresh token is reused", async () => {
    const refreshToken = "refresh-token-value";
    const tokenHash = sha256(refreshToken);
    const { prisma, service } = createService({
      prisma: {
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue({
            id: "refresh_1",
            tokenHash,
            familyId: "family_1",
            userId: "user_1",
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: new Date(),
            user
          }),
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        }
      }
    });

    await expect(
      service.refresh(refreshToken, {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        OR: [{ familyId: "family_1" }, { id: "family_1" }]
      },
      data: { revokedAt: expect.any(Date) }
    });
  });

  it("continues to ignore invalid refresh tokens during logout", async () => {
    const { prisma, service } = createService({
      jwtService: {
        verifyAsync: vi.fn().mockRejectedValue(new Error("invalid token"))
      }
    });

    await expect(service.logout("invalid-refresh-token")).resolves.toBeUndefined();

    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it("rejects expired refresh tokens", async () => {
    const refreshToken = "refresh-token-value";
    const tokenHash = sha256(refreshToken);
    const { service } = createService({
      prisma: {
        refreshToken: {
          create: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue({
            id: "refresh_1",
            tokenHash,
            familyId: "family_1",
            userId: "user_1",
            expiresAt: new Date(Date.now() - 60_000),
            revokedAt: null,
            user
          }),
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        }
      }
    });

    await expect(
      service.refresh(refreshToken, {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
