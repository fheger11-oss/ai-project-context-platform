import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { GenerateDocumentDto } from "./generate-document.dto.js";

async function validateDto(input: unknown) {
  return validate(plainToInstance(GenerateDocumentDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true
  });
}

describe("GenerateDocumentDto", () => {
  it("accepts the current document generation transport contract", async () => {
    await expect(
      validateDto({
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).resolves.toHaveLength(0);
  });

  it("rejects unsupported document types and formats at the API boundary", async () => {
    const errors = await validateDto({
      contextId: "project_context_1",
      documentType: "README",
      format: "HTML",
      generatorVersion: "document-generator@1"
    });

    expect(errors.map((error) => error.property)).toEqual(["documentType", "format"]);
  });

  it("rejects malformed request payloads", async () => {
    const errors = await validateDto({
      contextId: "",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "",
      extra: "not allowed"
    });

    expect(errors.map((error) => error.property).sort()).toEqual([
      "contextId",
      "extra",
      "generatorVersion"
    ]);
  });
});
