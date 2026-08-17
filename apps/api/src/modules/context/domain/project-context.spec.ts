import { describe, expect, it } from "vitest";

import type { ContextClaim } from "./context-claim.js";
import { InvalidProjectContextProvenanceError } from "./errors/invalid-project-context-provenance.error.js";
import { ProjectContext } from "./project-context.js";

describe("ProjectContext", () => {
  const provenance = {
    contextId: "context_1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    contextVersion: "context-engine@1",
    generatedAt: new Date("2026-08-17T10:00:00.000Z")
  };

  it("constructs a context with required provenance and empty sections", () => {
    const context = ProjectContext.create(provenance);

    expect(context.contextId).toBe("context_1");
    expect(context.analysisId).toBe("analysis_1");
    expect(context.scanId).toBe("scan_1");
    expect(context.repositoryId).toBe("repository_1");
    expect(context.commitSha).toBe("abc123");
    expect(context.contextVersion).toBe("context-engine@1");
    expect(context.generatedAt).toEqual(provenance.generatedAt);
    expect(context.toSnapshot()).toMatchObject({
      project: { claims: [] },
      technology: { claims: [] },
      structure: { claims: [] },
      architecture: { claims: [] },
      entryPoints: { claims: [] },
      testing: { claims: [] },
      infrastructure: { claims: [] },
      ambiguities: []
    });
  });

  it("preserves analysis lineage separately from context versioning", () => {
    const context = ProjectContext.create({
      ...provenance,
      contextVersion: "context-engine@2"
    });

    expect(context.toSnapshot()).toMatchObject({
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@2"
    });
  });

  it("rejects missing provenance", () => {
    expect(() =>
      ProjectContext.create({
        ...provenance,
        analysisId: " "
      })
    ).toThrow(InvalidProjectContextProvenanceError);
  });

  it("represents observed and inferred claims with confidence and evidence", () => {
    const observed: ContextClaim = {
      value: "package.json declares @nestjs/core",
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: [
        {
          kind: "DEPENDENCY",
          reference: {
            kind: "DEPENDENCY",
            manifestPath: "package.json",
            name: "@nestjs/core"
          }
        }
      ]
    };
    const inferred: ContextClaim = {
      value: "Project likely uses NestJS",
      kind: "INFERRED",
      confidence: "MEDIUM",
      evidence: [
        {
          kind: "MANIFEST",
          reference: {
            kind: "MANIFEST",
            path: "package.json"
          }
        }
      ]
    };

    const context = ProjectContext.create({
      ...provenance,
      technology: {
        claims: [observed, inferred]
      }
    });

    expect(context.toSnapshot().technology.claims).toEqual([observed, inferred]);
  });
});
