import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { DependencyIntelligenceQueryDto } from "./dependency-intelligence-query.dto.js";

describe("DependencyIntelligenceQueryDto", () => {
  it("uses bounded one-based defaults", async () => {
    const dto = plainToInstance(DependencyIntelligenceQueryDto, {});
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ page: 1, pageSize: 20, findingPage: 1, findingPageSize: 20 });
  });

  it.each([{ page: 0 }, { pageSize: 51 }, { findingPage: 0 }, { findingPageSize: 51 }])(
    "rejects invalid pagination %#",
    async (input) => {
      expect(await validate(plainToInstance(DependencyIntelligenceQueryDto, input))).not.toEqual(
        []
      );
    }
  );
});
