import { Module } from "@nestjs/common";

import { ScanService } from "./application/scan.service.js";
import { REPOSITORY_ACCESS_RESOLVER } from "./domain/contracts/repository-access-resolver.contract.js";
import { REPOSITORY_CONTENT_PROVIDER } from "./domain/contracts/repository-content-provider.contract.js";
import { SCAN_REPOSITORY } from "./domain/contracts/scan-repository.contract.js";
import { GitHubRepositoryContentProvider } from "./infrastructure/github-repository-content.provider.js";
import { PrismaScanRepository } from "./infrastructure/prisma-scan.repository.js";
import { RepositoryAccessResolverInfrastructure } from "./infrastructure/repository-access.resolver.js";
import { ScanController } from "./presentation/scan.controller.js";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";

@Module({
  imports: [AuthModule, PrismaModule, RepositoriesModule],
  controllers: [ScanController],
  providers: [
    ScanService,
    {
      provide: REPOSITORY_ACCESS_RESOLVER,
      useClass: RepositoryAccessResolverInfrastructure
    },
    {
      provide: SCAN_REPOSITORY,
      useClass: PrismaScanRepository
    },
    {
      provide: REPOSITORY_CONTENT_PROVIDER,
      useClass: GitHubRepositoryContentProvider
    }
  ]
})
export class ScanModule {}
