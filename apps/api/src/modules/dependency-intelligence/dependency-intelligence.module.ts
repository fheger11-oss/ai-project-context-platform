import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { DEPENDENCY_SNAPSHOT_READER } from "./domain/contracts/dependency-snapshot-reader.contract.js";
import { PrismaDependencySnapshotReader } from "./infrastructure/prisma-dependency-snapshot.reader.js";

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: DEPENDENCY_SNAPSHOT_READER,
      useClass: PrismaDependencySnapshotReader
    }
  ],
  exports: [DEPENDENCY_SNAPSHOT_READER]
})
export class DependencyIntelligenceModule {}
