import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { DocumentHistoryQueryDto } from "./document-history-query.dto.js";

async function validateDto(input: unknown) {
  return validate(plainToInstance(DocumentHistoryQueryDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true
  });
}

describe("DocumentHistoryQueryDto", () => {
  it("accepts the ProjectContext identifier used to read document history", async () => {
    await expect(validateDto({ contextId: "project_context_1" })).resolves.toHaveLength(0);
  });

  it("rejects malformed document history queries", async () => {
    const errors = await validateDto({ contextId: "", extra: "not allowed" });

    expect(errors.map((error) => error.property).sort()).toEqual(["contextId", "extra"]);
  });
});
