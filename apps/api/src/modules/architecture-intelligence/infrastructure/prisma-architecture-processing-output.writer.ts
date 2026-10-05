import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureProcessingOutput,
  ArchitectureProcessingOutputWriter
} from "../domain/contracts/architecture-processing-output-writer.contract.js";

@Injectable()
export class PrismaArchitectureProcessingOutputWriter implements ArchitectureProcessingOutputWriter {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async persist(output: ArchitectureProcessingOutput): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      if (output.measurements.length > 0) {
        await transaction.architectureModuleMeasurement.createMany({
          data: [...output.measurements],
          skipDuplicates: true
        });
      }
      if (output.findings.length > 0) {
        await transaction.architectureFindingOccurrence.createMany({
          data: output.findings.map((finding) => ({
            ...finding,
            subject: toJson(finding.subject),
            evidence: toJson(finding.evidence)
          })),
          skipDuplicates: true
        });
      }
    });
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
