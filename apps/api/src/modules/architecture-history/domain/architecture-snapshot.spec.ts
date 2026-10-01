import { describe, expect, it } from "vitest";

import {
  moduleClaim,
  relationshipClaim,
  snapshot
} from "../testing/architecture-history-fixtures.js";
import { parseArchitectureSnapshot } from "./architecture-snapshot.js";

describe("parseArchitectureSnapshot", () => {
  it("validates and deterministically orders modules and directed relationships", () => {
    const parsed = parseArchitectureSnapshot(
      snapshot([
        moduleClaim("src/z"),
        moduleClaim("src/a"),
        relationshipClaim("module:src/z", "module:src/a")
      ])
    );

    expect(parsed.valid).toBe(true);
    if (!parsed.valid) return;
    expect([...parsed.snapshot.modules.keys()]).toEqual(["module:src/a", "module:src/z"]);
    expect([...parsed.snapshot.relationships.keys()]).toEqual(["module:src/z\0module:src/a"]);
  });

  it.each(["/src/auth", "src//auth", "src/./auth", "src/../auth", "src\\auth"])(
    "rejects malformed repository-relative path %s",
    (path) => {
      expect(parseArchitectureSnapshot(snapshot([moduleClaim(path)])).valid).toBe(false);
    }
  );

  it("rejects a module ID that is not derived from its path", () => {
    const parsed = parseArchitectureSnapshot(
      snapshot([moduleClaim("src/auth", { moduleId: "module:src/users" })])
    );
    expect(parsed.valid).toBe(false);
  });

  it("rejects orphan relationships", () => {
    const parsed = parseArchitectureSnapshot(
      snapshot([moduleClaim("src/auth"), relationshipClaim("module:src/auth", "module:src/users")])
    );
    expect(parsed.valid).toBe(false);
  });

  it("collapses identical identities but rejects conflicting duplicates", () => {
    expect(
      parseArchitectureSnapshot(snapshot([moduleClaim("src/auth"), moduleClaim("src/auth")])).valid
    ).toBe(true);
    expect(
      parseArchitectureSnapshot(
        snapshot([moduleClaim("src/auth"), moduleClaim("src/auth", { sourceFileCount: 3 })])
      ).valid
    ).toBe(false);
  });

  it("rejects unsupported architecture claims", () => {
    const parsed = parseArchitectureSnapshot(
      snapshot([{ kind: "INFERRED", confidence: "HIGH", evidence: [], value: { type: "OTHER" } }])
    );
    expect(parsed).toMatchObject({
      valid: false,
      diagnostics: [{ code: "UNSUPPORTED_ARCHITECTURE_CLAIM" }]
    });
  });

  it("suppresses low-confidence claims", () => {
    const claim = moduleClaim("src/auth");
    claim.confidence = "LOW";
    const parsed = parseArchitectureSnapshot(snapshot([claim]));
    expect(parsed.valid).toBe(true);
    if (!parsed.valid) return;
    expect(parsed.snapshot.modules.size).toBe(0);
    expect(parsed.snapshot.suppressedClaims).toEqual([
      { identity: "module:src/auth", reason: "LOW_CONFIDENCE" }
    ]);
  });
});
