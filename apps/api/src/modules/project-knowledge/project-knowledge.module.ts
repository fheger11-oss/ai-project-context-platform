import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ProjectKnowledgeService } from "./application/project-knowledge.service.js";
import { PROJECT_KNOWLEDGE_REPOSITORY } from "./domain/contracts/project-knowledge-repository.contract.js";
import { PrismaProjectKnowledgeRepository } from "./infrastructure/prisma-project-knowledge.repository.js";
import { ProjectKnowledgeController } from "./presentation/project-knowledge.controller.js";

@Module({
  imports: [PrismaModule, RepositoriesModule],
  controllers: [ProjectKnowledgeController],
  providers: [
    ProjectKnowledgeService,
    { provide: PROJECT_KNOWLEDGE_REPOSITORY, useClass: PrismaProjectKnowledgeRepository }
  ],
  exports: [ProjectKnowledgeService, PROJECT_KNOWLEDGE_REPOSITORY]
})
export class ProjectKnowledgeModule {}
