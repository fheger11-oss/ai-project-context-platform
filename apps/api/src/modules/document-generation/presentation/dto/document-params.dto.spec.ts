import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { DocumentParamsDto } from "./document-params.dto.js";

async function validateDto(input: unknown) {
  return validate(plainToInstance(DocumentParamsDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true
  });
}

describe("DocumentParamsDto", () => {
  it("accepts the document identifier transport parameter", async () => {
    await expect(validateDto({ documentId: "document_1" })).resolves.toHaveLength(0);
  });

  it("rejects malformed document parameters", async () => {
    const errors = await validateDto({ documentId: "", extra: "not allowed" });

    expect(errors.map((error) => error.property).sort()).toEqual(["documentId", "extra"]);
  });
});
