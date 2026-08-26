import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { DashboardProjectsQueryService } from "./dashboard-projects-query.service.js";
import { DashboardController } from "./dashboard.controller.js";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardProjectsQueryService],
  exports: [DashboardProjectsQueryService]
})
export class DashboardModule {}
