import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { LoginDto } from "./login.dto.js";

function validateDto(input: Record<string, unknown>) {
  return validate(plainToInstance(LoginDto, input), {
    forbidNonWhitelisted: true,
    whitelist: true
  });
}

describe("LoginDto", () => {
  it("accepts credentials within the registration limits", async () => {
    await expect(
      validateDto({ email: "founder@example.com", password: "correct horse battery staple" })
    ).resolves.toHaveLength(0);
  });

  it("rejects oversized email and password input", async () => {
    const emailErrors = await validateDto({
      email: `${"a".repeat(309)}@example.com`,
      password: "valid-password"
    });
    const passwordErrors = await validateDto({
      email: "founder@example.com",
      password: "p".repeat(129)
    });

    expect(emailErrors.map((error) => error.property)).toContain("email");
    expect(passwordErrors.map((error) => error.property)).toContain("password");
  });
});
