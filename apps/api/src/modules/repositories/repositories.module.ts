import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { GitHubRepositoryProvider } from "./providers/github-repository.provider.js";
import { RepositoriesController } from "./repositories.controller.js";
import { RepositoriesService } from "./repositories.service.js";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RepositoriesController],
  providers: [GitHubRepositoryProvider, RepositoriesService],
  exports: [RepositoriesService]
})
export class RepositoriesModule {}
