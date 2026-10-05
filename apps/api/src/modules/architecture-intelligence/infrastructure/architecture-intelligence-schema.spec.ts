import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("architecture intelligence persistence schema", () => {
  it("defines architecture-specific processing states", () => {
    expect(schema).toMatch(
      /enum ArchitectureProcessingStatus \{[\s\S]*PENDING[\s\S]*PROCESSING[\s\S]*COMPLETED[\s\S]*FAILED[\s\S]*INCOMPATIBLE[\s\S]*\}/
    );
  });

  it("makes processing requests idempotent per context and processor version", () => {
    expect(schema).toMatch(/model ArchitectureProcessingRequest \{/);
    expect(schema).toMatch(/@@unique\(\[projectContextId, processorVersion\]\)/);
    expect(schema).toMatch(/@@index\(\[status, nextAttemptAt\]\)/);
    expect(schema).toMatch(/@@index\(\[status, leaseUntil\]\)/);
  });

  it("enforces repository-scoped context and request provenance", () => {
    expect(schema).toMatch(
      /@relation\("ArchitectureProcessingRequestProjectContext", fields: \[projectContextId, repositoryId\], references: \[id, repositoryId\], onDelete: Restrict\)/
    );
    expect(schema).toMatch(
      /processingRequest\s+ArchitectureProcessingRequest\s+@relation\(fields: \[processingRequestId, projectContextId, repositoryId\], references: \[id, projectContextId, repositoryId\], onDelete: Cascade\)/
    );
    expect(schema).toMatch(
      /processingRequest\s+ArchitectureProcessingRequest\s+@relation\(fields: \[processingRequestId, projectContextId, repositoryId\], references: \[id, projectContextId, repositoryId\], onDelete: Cascade\)/
    );
  });

  it("defines immutable occurrence and raw measurement uniqueness", () => {
    const occurrence = schema.match(/model ArchitectureFindingOccurrence \{([\s\S]*?)\n\}/)?.[1];
    expect(occurrence).toBeDefined();
    expect(occurrence).toMatch(/subject\s+Json/);
    expect(occurrence).toMatch(/evidence\s+Json/);
    expect(occurrence).toMatch(/@@unique\(\[processingRequestId, fingerprint\]\)/);
    expect(occurrence).not.toMatch(/severity|acknowledged|suppressed|resolvedAt/);

    expect(schema).toMatch(/model ArchitectureModuleMeasurement \{/);
    expect(schema).toMatch(/@@unique\(\[processingRequestId, moduleId\]\)/);
  });
});
