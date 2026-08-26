import { describe, expect, it } from "vitest";

import { ContextModule } from "../context/context.module.js";
import { PROJECT_CONTEXT_READER } from "../context/domain/contracts/project-context-reader.contract.js";
import { GenerateAiExportUseCase } from "./application/generate-ai-export.use-case.js";
import { ProjectContextAiExportProjector } from "./application/project-context-ai-export.projector.js";
import { AI_EXPORT_PROJECTOR } from "./domain/contracts/ai-export-projector.contract.js";
import type { CanonicalAiExport } from "./domain/canonical-ai-export.js";
import { AiExportSerializerRouter } from "./infrastructure/serializers/ai-export-serializer.router.js";
import { AiExportController } from "./presentation/ai-export.controller.js";
import { AiExportModule } from "./ai-export.module.js";

const canonical: CanonicalAiExport = {
  metadata: {
    contextId: "context_1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    contextVersion: "context-engine@5.7.1",
    generatedAt: "2026-08-26T10:00:00.000Z",
    exportVersion: "ai-export@1"
  },
  sections: [],
  ambiguities: [],
  summary: {
    sectionCount: 0,
    populatedSectionCount: 0,
    sectionClaimCount: 0,
    ambiguityCount: 0,
    totalClaimCount: 0,
    observedClaimCount: 0,
    inferredClaimCount: 0,
    evidenceCount: 0
  }
};

describe("AiExportModule", () => {
  const metadata = Reflect.getMetadata("imports", AiExportModule) as unknown[];
  const providers = Reflect.getMetadata("providers", AiExportModule) as Array<
    | {
        provide?: unknown;
        useClass?: unknown;
        useFactory?: (...args: never[]) => unknown;
        inject?: unknown[];
      }
    | unknown
  >;
  const controllers = Reflect.getMetadata("controllers", AiExportModule) as unknown[];
  const exports = Reflect.getMetadata("exports", AiExportModule) as unknown[];

  it("imports ContextModule for the ProjectContext reader boundary", () => {
    expect(metadata).toContain(ContextModule);
  });

  it("registers the projector, serializer router, use case, and controller", () => {
    expect(controllers).toContain(AiExportController);
    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provide: AI_EXPORT_PROJECTOR,
          useClass: ProjectContextAiExportProjector
        }),
        expect.objectContaining({
          provide: AiExportSerializerRouter
        }),
        expect.objectContaining({
          provide: GenerateAiExportUseCase,
          inject: [PROJECT_CONTEXT_READER, AI_EXPORT_PROJECTOR, AiExportSerializerRouter]
        })
      ])
    );
    expect(exports).toEqual(
      expect.arrayContaining([
        GenerateAiExportUseCase,
        AI_EXPORT_PROJECTOR,
        AiExportSerializerRouter
      ])
    );
  });

  it("wires all supported sibling serializers into the serializer router", () => {
    const routerProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === AiExportSerializerRouter
    ) as { useFactory: () => AiExportSerializerRouter };
    const router = routerProvider.useFactory();

    expect(router.serialize(canonical, "AI_CONTEXT")).toMatchObject({
      format: "AI_CONTEXT",
      filename: "ai-context.json"
    });
    expect(router.serialize(canonical, "MARKDOWN")).toMatchObject({
      format: "MARKDOWN",
      filename: "ai-context.md"
    });
    expect(router.serialize(canonical, "TEXT")).toMatchObject({
      format: "TEXT",
      filename: "ai-context.txt"
    });
  });
});
