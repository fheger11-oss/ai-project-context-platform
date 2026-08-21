import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { GitHubCallbackDto } from "./github-callback.dto.js";

function validateDto(input: Record<string, unknown>) {
  return validate(plainToInstance(GitHubCallbackDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true
  });
}

describe("GitHubCallbackDto", () => {
  it("accepts the existing GitHub callback shape without issuer", async () => {
    await expect(validateDto({ code: "test-code", state: "test-state" })).resolves.toHaveLength(0);
  });

  it("accepts GitHub callbacks with the expected issuer parameter", async () => {
    await expect(
      validateDto({
        code: "test-code",
        state: "test-state",
        iss: "https://github.com/login/oauth"
      })
    ).resolves.toHaveLength(0);
  });

  it("rejects callbacks with an unexpected issuer", async () => {
    const errors = await validateDto({
      code: "test-code",
      state: "test-state",
      iss: "https://evil.example.com"
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "iss",
          constraints: expect.objectContaining({
            equals: "iss must be equal to https://github.com/login/oauth"
          })
        })
      ])
    );
  });

  it("continues to reject unrelated unknown callback parameters", async () => {
    const errors = await validateDto({
      code: "test-code",
      state: "test-state",
      iss: "https://github.com/login/oauth",
      unexpected: "value"
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "unexpected",
          constraints: expect.objectContaining({
            whitelistValidation: "property unexpected should not exist"
          })
        })
      ])
    );
  });

  it("continues to require code and state", async () => {
    const missingCodeErrors = await validateDto({ state: "test-state" });
    const missingStateErrors = await validateDto({ code: "test-code" });

    expect(missingCodeErrors.map((error) => error.property)).toContain("code");
    expect(missingStateErrors.map((error) => error.property)).toContain("state");
  });
});
