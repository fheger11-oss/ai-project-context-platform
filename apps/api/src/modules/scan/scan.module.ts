import { Module } from "@nestjs/common";

import { ScanService } from "./application/scan.service.js";
import { REPOSITORY_CONTENT_PROVIDER } from "./domain/contracts/repository-content-provider.contract.js";
import { SCAN_REPOSITORY } from "./domain/contracts/scan-repository.contract.js";
import { GitHubRepositoryContentProvider } from "./infrastructure/github-repository-content.provider.js";
import { PrismaScanRepository } from "./infrastructure/prisma-scan.repository.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ScanService,
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
