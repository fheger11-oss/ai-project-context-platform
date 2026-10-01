import { describe, expect, it } from "vitest";
import {
  canTransitionProjectKnowledgeStatus,
  normalizeProjectKnowledgeContent
} from "./project-knowledge.js";

describe("Project Knowledge domain", () => {
  it.each([
    ["ACTIVE", "ACTIVE", true],
    ["ACTIVE", "ARCHIVED", true],
    ["ACTIVE", "SUPERSEDED", true],
    ["ARCHIVED", "ACTIVE", true],
    ["ARCHIVED", "ARCHIVED", true],
    ["SUPERSEDED", "SUPERSEDED", true],
    ["SUPERSEDED", "ACTIVE", false],
    ["SUPERSEDED", "ARCHIVED", false]
  ] as const)("validates %s to %s", (from, to, expected) =>
    expect(canTransitionProjectKnowledgeStatus(from, to)).toBe(expected)
  );

  it("trims content and rejects empty or oversized content", () => {
    expect(normalizeProjectKnowledgeContent("  durable fact  ")).toBe("durable fact");
    expect(() => normalizeProjectKnowledgeContent("   ")).toThrow();
    expect(() => normalizeProjectKnowledgeContent("x".repeat(20_001))).toThrow();
  });
});
