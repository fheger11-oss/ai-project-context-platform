import { describe, expectTypeOf, it } from "vitest";

import type {
  ArchitectureComparisonResponse,
  ArchitectureHistoryResponse,
  ComparableArchitectureComparison
} from "./architecture-history.js";

describe("ArchitectureHistory contracts", () => {
  it("uses an explicit comparison discriminator", () => {
    expectTypeOf<ArchitectureComparisonResponse["status"]>().toEqualTypeOf<
      "COMPARABLE" | "INCOMPATIBLE" | "INCOMPLETE" | "NO_BASELINE"
    >();
  });

  it("models repository history summaries", () => {
    expectTypeOf<ArchitectureHistoryResponse["items"][number]>()
      .toHaveProperty("analyzerVersion")
      .toEqualTypeOf<string>();
  });

  it("keeps structural comparison fields explicit", () => {
    expectTypeOf<ComparableArchitectureComparison>().toHaveProperty("modifiedModules").toBeArray();
    expectTypeOf<ComparableArchitectureComparison>().not.toHaveProperty("payload");
  });
});
