import { describe, expectTypeOf, it } from "vitest";

import type {
  ContextClaim,
  ContextEvidence,
  ProjectContextArchitectureModel,
  ProjectContextSemantic,
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

  it("models explicit semantic preservation records without claim confidence", () => {
    expectTypeOf<ProjectContextSemantic>().toMatchTypeOf<{
      packages: readonly { id: string; manifestPath: string }[];
      files: readonly { id: string; path: string; symbolIds: readonly string[] }[];
      symbols: readonly { id: string; fileId: string; location: { start: number; end: number } }[];
      imports: readonly { id: string; moduleSpecifier: string; typeOnly: boolean }[];
      exports: readonly { id: string; moduleSpecifier: string | null }[];
      relationships: readonly {
        id: string;
        kind: "IMPORTS" | "RE_EXPORTS";
        evidence: readonly { id: string; sourceRecordId: string | null }[];
      }[];
    }>();
    expectTypeOf<ProjectContextSemantic["packages"][number]>().toHaveProperty(
      "publicSurfaceDeclarations"
    );
    expectTypeOf<ProjectContextSemantic["symbols"][number]>().not.toHaveProperty("confidence");
    expectTypeOf<ProjectContextSemantic["relationships"][number]>().not.toHaveProperty("calls");
  });

  it("models explicit architectural modules without runtime dependency semantics", () => {
    expectTypeOf<ProjectContextArchitectureModel>().toMatchTypeOf<{
      modules: readonly {
        id: string;
        kind: "WORKSPACE_PACKAGE" | "BACKEND_FEATURE" | "FRONTEND_FEATURE" | "SHARED_AREA";
        packageId: string;
        parentModuleId: string | null;
        fileIds: readonly string[];
        layers: readonly { kind: string; fileIds: readonly string[] }[];
        sourceExports: readonly { exportId: string; fileId: string }[];
        frameworkSignals: readonly { kind: "NESTJS_MODULE_CANDIDATE" }[];
        inference: "OBSERVED" | "STRONGLY_INFERRED" | "INFERRED";
        confidence: "HIGH" | "MEDIUM" | "LOW";
      }[];
      dependencies: readonly {
        id: string;
        sourceModuleId: string;
        targetModuleId: string;
        relationshipKinds: readonly ("IMPORTS" | "RE_EXPORTS")[];
        relationshipIds: readonly string[];
        resolution: "RESOLVED";
      }[];
      publicSurfaces: readonly {
        id: string;
        packageId: string;
        subpath: string;
        status: "RESOLVED" | "PARTIAL" | "UNRESOLVED" | "BLOCKED";
        declarations: readonly { declarationId: string; targetFileId: string | null }[];
      }[];
    }>();
    expectTypeOf<ProjectContextArchitectureModel["modules"][number]>().not.toHaveProperty(
      "dependencies"
    );
    expectTypeOf<ProjectContextArchitectureModel["modules"][number]>().not.toHaveProperty(
      "providers"
    );
  });
});
