import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { ArchitectureIntelligenceQueryDto } from "./architecture-intelligence-query.dto.js";

describe("ArchitectureIntelligenceQueryDto", () => {
  it("uses bounded one-based defaults", async () => {
    const dto = plainToInstance(ArchitectureIntelligenceQueryDto, {});
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ page: 1, pageSize: 20, modulePage: 1, modulePageSize: 20 });
  });

  it("accepts the architecture filters", async () => {
    const dto = plainToInstance(ArchitectureIntelligenceQueryDto, {
      ruleId: "architecture.circular-dependency",
      confidence: "HIGH",
      lifecycle: "RECURRING"
    });
    expect(await validate(dto)).toEqual([]);
  });

  it.each([
    { page: 0 },
    { pageSize: 51 },
    { modulePage: 0 },
    { modulePageSize: 51 },
    { confidence: "CERTAIN" },
    { lifecycle: "ACTIVE" },
    { ruleId: "architecture.unknown" }
  ])("rejects invalid query %#", async (input) => {
    expect(await validate(plainToInstance(ArchitectureIntelligenceQueryDto, input))).not.toEqual(
      []
    );
  });
});
