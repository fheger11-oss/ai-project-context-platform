import { describe, expect, it } from "vitest";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { GetProjectTimelineService } from "./application/get-project-timeline.service.js";
import { PROJECT_TIMELINE_READER } from "./domain/contracts/project-timeline-reader.contract.js";
import { PrismaProjectTimelineReader } from "./infrastructure/prisma-project-timeline.reader.js";
import { ProjectTimelineController } from "./presentation/project-timeline.controller.js";
import { ProjectTimelineModule } from "./project-timeline.module.js";

describe("ProjectTimelineModule", () => {
  it("wires the focused read model to repositories and Prisma", () => {
    expect(Reflect.getMetadata("imports", ProjectTimelineModule)).toEqual([
      PrismaModule,
      RepositoriesModule
    ]);
    expect(Reflect.getMetadata("controllers", ProjectTimelineModule)).toEqual([
      ProjectTimelineController
    ]);
    expect(Reflect.getMetadata("providers", ProjectTimelineModule)).toEqual([
      GetProjectTimelineService,
      { provide: PROJECT_TIMELINE_READER, useClass: PrismaProjectTimelineReader }
    ]);
  });
});
