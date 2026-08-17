import { describe, expectTypeOf, it } from "vitest";

import type {
  ContextClaim,
  ContextEvidence,
  ProjectContextHistoryResponse,
  ProjectContextResponse
} from "./context.js";

describe("context contracts", () => {
  it("models public ProjectContext responses without Prisma internals", () => {
    expectTypeOf<ProjectContextResponse>().toMatchTypeOf<{
      id: string;
      contextId: string;
      analysisId: string;
      scanId: string;
      repositoryId: string;
      commitSha: string;
      contextVersion: string;
      generatedAt: string;
      createdAt: string;
      project: { claims: readonly ContextClaim[] };
      technology: { claims: readonly ContextClaim[] };
      structure: { claims: readonly ContextClaim[] };
      architecture: { claims: readonly ContextClaim[] };
      entryPoints: { claims: readonly ContextClaim[] };
      testing: { claims: readonly ContextClaim[] };
      infrastructure: { claims: readonly ContextClaim[] };
      ambiguities: readonly ContextClaim[];
    }>();
    expectTypeOf<ProjectContextResponse>().not.toHaveProperty("snapshot");
    expectTypeOf<ProjectContextResponse>().not.toHaveProperty("prisma");
  });

  it("preserves evidence, confidence, and observed/inferred semantics", () => {
    expectTypeOf<ContextClaim>().toMatchTypeOf<{
      value: unknown;
      kind: "OBSERVED" | "INFERRED";
      confidence: "HIGH" | "MEDIUM" | "LOW";
      evidence: readonly ContextEvidence[];
    }>();
  });

  it("models Context history as immutable summaries", () => {
    expectTypeOf<ProjectContextHistoryResponse>().toMatchTypeOf<{
      items: readonly {
        id: string;
        contextId: string;
        analysisId: string;
        scanId: string;
        repositoryId: string;
        commitSha: string;
        contextVersion: string;
        generatedAt: string;
        createdAt: string;
      }[];
    }>();
  });
});
