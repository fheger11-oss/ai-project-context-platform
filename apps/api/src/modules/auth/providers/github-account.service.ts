import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import { ProviderTokenCipherService } from "./provider-token-cipher.service.js";

type GitHubAccountInput = {
  accessToken: string;
  avatarUrl: string | null;
  displayName: string | null;
  githubId: string;
  login: string;
  scope: string | null;
  userId: string;
};

@Injectable()
export class GitHubAccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProviderTokenCipherService)
    private readonly providerTokenCipher: ProviderTokenCipherService
  ) {}

  async upsert(input: GitHubAccountInput) {
    const encryptedToken = this.providerTokenCipher.encrypt(input.accessToken);

    return this.prisma.gitHubAccount.upsert({
      where: {
        userId: input.userId
      },
      create: {
        userId: input.userId,
        githubId: input.githubId,
        avatarUrl: input.avatarUrl,
        displayName: input.displayName,
        login: input.login,
        scope: input.scope,
        ...encryptedToken
      },
      update: {
        githubId: input.githubId,
        avatarUrl: input.avatarUrl,
        displayName: input.displayName,
        login: input.login,
        scope: input.scope,
        ...encryptedToken
      }
    });
  }

  async getAccessTokenForUser(userId: string) {
    const githubAccount = await this.prisma.gitHubAccount.findUnique({
      where: { userId }
    });

    if (!githubAccount) {
      throw new UnauthorizedException("GitHub account is not connected");
    }

    return this.providerTokenCipher.decrypt({
      accessTokenEncrypted: githubAccount.accessTokenEncrypted,
      accessTokenIv: githubAccount.accessTokenIv,
      accessTokenAuthTag: githubAccount.accessTokenAuthTag
    });
  }
}
