import { describe, expect, it } from "vitest";

import { historySource, moduleClaim, snapshot } from "../testing/architecture-history-fixtures.js";
import { buildArchitectureComparison } from "./architecture-history-projection.js";

describe("buildArchitectureComparison", () => {
  it("returns NO_BASELINE for the first durable snapshot", () => {
    expect(buildArchitectureComparison(null, historySource()).status).toBe("NO_BASELINE");
  });

  it.each([{ contextVersion: "context-engine@5.7.0" }, { analyzerVersion: "analysis-engine-4.9" }])(
    "requires exact context and analyzer versions",
    (change) => {
      expect(buildArchitectureComparison(historySource(change), historySource()).status).toBe(
        "INCOMPATIBLE"
      );
    }
  );

  it("returns INCOMPLETE for malformed architecture JSON", () => {
    expect(
      buildArchitectureComparison(historySource({ snapshot: {} }), historySource()).status
    ).toBe("INCOMPLETE");
  });

  it("returns INCOMPLETE for an eligible-to-low-confidence transition", () => {
    const low = moduleClaim("src/a");
    low.confidence = "LOW";
    const result = buildArchitectureComparison(
      historySource(),
      historySource({ snapshot: snapshot([low]) })
    );
    expect(result.status).toBe("INCOMPLETE");
    if (result.status !== "INCOMPLETE") return;
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "LOW_CONFIDENCE_TRANSITION" })
    );
  });

  it("returns a deterministic COMPARABLE result", () => {
    const result = buildArchitectureComparison(
      historySource(),
      historySource({ historyId: "history0002" })
    );
    expect(result).toMatchObject({
      status: "COMPARABLE",
      addedModules: [],
      removedModules: [],
      unchangedModuleCount: 1
    });
  });
});
