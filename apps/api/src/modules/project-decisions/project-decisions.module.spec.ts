import { describe, expect, it } from "vitest";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ProjectDecisionService } from "./application/project-decision.service.js";
import { PROJECT_DECISION_REPOSITORY } from "./domain/contracts/project-decision-repository.contract.js";
import { PrismaProjectDecisionRepository } from "./infrastructure/prisma-project-decision.repository.js";
import { ProjectDecisionController } from "./presentation/project-decision.controller.js";
import { ProjectDecisionsModule } from "./project-decisions.module.js";

describe("ProjectDecisionsModule", () => {
  it("wires the focused domain to repositories and Prisma", () => {
    expect(Reflect.getMetadata("imports", ProjectDecisionsModule)).toEqual([
      PrismaModule,
      RepositoriesModule
    ]);
    expect(Reflect.getMetadata("controllers", ProjectDecisionsModule)).toEqual([
      ProjectDecisionController
    ]);
    expect(Reflect.getMetadata("providers", ProjectDecisionsModule)).toEqual(
      expect.arrayContaining([
        ProjectDecisionService,
        { provide: PROJECT_DECISION_REPOSITORY, useClass: PrismaProjectDecisionRepository }
      ])
    );
  });
});
