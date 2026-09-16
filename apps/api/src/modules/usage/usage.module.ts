import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { OperationLockService } from "./operation-lock.service.js";
import { UsageService } from "./usage.service.js";

@Module({
  imports: [PrismaModule],
  providers: [OperationLockService, UsageService],
  exports: [OperationLockService, UsageService]
})
export class UsageModule {}
