import { describe, expect, it } from "vitest";

import { canTransitionProjectDecisionStatus } from "./project-decision.js";

describe("ProjectDecision lifecycle", () => {
  it.each([
    ["ACTIVE", "SUPERSEDED"],
    ["ACTIVE", "ARCHIVED"],
    ["ARCHIVED", "ACTIVE"]
  ] as const)("allows %s to transition to %s", (from, to) => {
    expect(canTransitionProjectDecisionStatus(from, to)).toBe(true);
  });

  it.each([
    ["SUPERSEDED", "ACTIVE"],
    ["SUPERSEDED", "ARCHIVED"]
  ] as const)("rejects %s to %s", (from, to) => {
    expect(canTransitionProjectDecisionStatus(from, to)).toBe(false);
  });

  it("allows an idempotent status correction", () => {
    expect(canTransitionProjectDecisionStatus("ACTIVE", "ACTIVE")).toBe(true);
  });
});
