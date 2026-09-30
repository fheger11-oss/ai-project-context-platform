import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateProjectDecisionDto } from "./create-project-decision.dto.js";

const valid = {
  title: "Database",
  decision: "Use managed Postgres.",
  rationale: "Reduce operational overhead.",
  affectedArea: "Infrastructure",
  decidedAt: "2026-09-30T10:00:00.000Z"
};

describe("ProjectDecision DTO validation", () => {
  it("accepts a valid decidedAt and trims authored fields", async () => {
    const dto = plainToInstance(CreateProjectDecisionDto, { ...valid, title: "  Database  " });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.title).toBe("Database");
  });

  it.each(["title", "decision", "rationale", "affectedArea"] as const)(
    "rejects a blank %s",
    async (field) => {
      const dto = plainToInstance(CreateProjectDecisionDto, { ...valid, [field]: "   " });
      expect(await validate(dto)).not.toHaveLength(0);
    }
  );

  it("rejects invalid dates and non-full commit SHAs", async () => {
    const dto = plainToInstance(CreateProjectDecisionDto, {
      ...valid,
      decidedAt: "not-a-date",
      sourceCommitSha: "abc123"
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["decidedAt", "sourceCommitSha"])
    );
  });
});
