import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ProjectDecisionService } from "./application/project-decision.service.js";
import { PROJECT_DECISION_REPOSITORY } from "./domain/contracts/project-decision-repository.contract.js";
import { PrismaProjectDecisionRepository } from "./infrastructure/prisma-project-decision.repository.js";
import { ProjectDecisionController } from "./presentation/project-decision.controller.js";

@Module({
  imports: [PrismaModule, RepositoriesModule],
  controllers: [ProjectDecisionController],
  providers: [
    ProjectDecisionService,
    { provide: PROJECT_DECISION_REPOSITORY, useClass: PrismaProjectDecisionRepository }
  ],
  exports: [ProjectDecisionService, PROJECT_DECISION_REPOSITORY]
})
export class ProjectDecisionsModule {}
