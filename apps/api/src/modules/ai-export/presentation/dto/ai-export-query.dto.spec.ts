import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { AiExportQueryDto } from "./ai-export-query.dto.js";

async function validateQuery(input: Record<string, unknown>) {
  const dto = plainToInstance(AiExportQueryDto, input);
  const errors = await validate(dto, {
    forbidNonWhitelisted: true,
    whitelist: true
  });

  return { dto, errors };
}

describe("AiExportQueryDto", () => {
  it.each(["AI_CONTEXT", "MARKDOWN", "TEXT"])("accepts supported format %s", async (format) => {
    const { dto, errors } = await validateQuery({ format });

    expect(errors).toEqual([]);
    expect(dto.format).toBe(format);
    expect(dto.download).toBe(false);
  });

  it("parses explicit download booleans from query strings", async () => {
    await expect(validateQuery({ format: "TEXT", download: "true" })).resolves.toMatchObject({
      dto: { download: true },
      errors: []
    });
    await expect(validateQuery({ format: "TEXT", download: "false" })).resolves.toMatchObject({
      dto: { download: false },
      errors: []
    });
  });

  it("rejects unsupported formats and invalid download values", async () => {
    await expect(validateQuery({ format: "HTML" })).resolves.toMatchObject({
      errors: [expect.objectContaining({ property: "format" })]
    });
    await expect(validateQuery({ format: "TEXT", download: "yes" })).resolves.toMatchObject({
      errors: [expect.objectContaining({ property: "download" })]
    });
  });
});
