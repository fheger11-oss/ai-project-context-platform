import { Inject, Injectable, Logger } from "@nestjs/common";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client.js";
import { AppConfigService } from "../config/app-config.service.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(AppConfigService) config: AppConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl
    });

    super({
      adapter,
      log: config.nodeEnv === "development" ? ["warn", "error"] : ["error"]
    });
  }

  async onModuleInit() {
    this.logger.log("Prisma client initialized");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Prisma disconnected");
  }
}
