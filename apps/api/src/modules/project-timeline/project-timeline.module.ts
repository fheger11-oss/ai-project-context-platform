import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { GetProjectTimelineService } from "./application/get-project-timeline.service.js";
import { PROJECT_TIMELINE_READER } from "./domain/contracts/project-timeline-reader.contract.js";
import { PrismaProjectTimelineReader } from "./infrastructure/prisma-project-timeline.reader.js";
import { ProjectTimelineController } from "./presentation/project-timeline.controller.js";

@Module({
  imports: [PrismaModule, RepositoriesModule],
  controllers: [ProjectTimelineController],
  providers: [
    GetProjectTimelineService,
    { provide: PROJECT_TIMELINE_READER, useClass: PrismaProjectTimelineReader }
  ]
})
export class ProjectTimelineModule {}
