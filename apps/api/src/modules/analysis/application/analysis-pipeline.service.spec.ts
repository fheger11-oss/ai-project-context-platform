import { describe, expect, it, vi } from "vitest";

import { Analysis } from "../domain/analysis.js";
import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import { InconsistentAnalysisResultContextError } from "../domain/errors/inconsistent-analysis-result-context.error.js";
import type { ProjectProfile } from "../domain/project-detection/project-profile.js";
import type { RelationshipAnalysisResult } from "../domain/relationships/source-relationship.js";
import type { SourceFileStructure } from "../domain/source-structure/source-file-structure.js";
import { AnalysisResultAggregationService } from "./analysis-result-aggregation.service.js";
import { AnalysisPipelineService } from "./analysis-pipeline.service.js";
import { InvalidAnalysisPipelineContextError } from "./errors/invalid-analysis-pipeline-context.error.js";
import type { FileClassificationService } from "./file-classification.service.js";
import type { ProjectDetectionService } from "./project-detection.service.js";
import type { RelationshipAnalysisService } from "./relationship-analysis.service.js";
import type { SourceStructureAnalysisService } from "./source-structure-analysis.service.js";

const generatedAt = new Date("2026-08-14T12:00:00.000Z");
const analysis = Analysis.create({
  id: "analysis_1",
  scanId: "scan_1",
  analyzerVersion: "analysis-4.8",
  createdAt: generatedAt,
  updatedAt: generatedAt
});

const analysisInput: AnalysisInput = {
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contentReader: {
    listFiles: vi.fn(),
    readFile: vi.fn()
  }
};

const projectProfile: ProjectProfile = {
  ecosystems: ["NODE_JS"],
  languages: [{ language: "TYPESCRIPT", fileCount: 2 }],
  packageManager: {
    status: "DETECTED",
    packageManager: "PNPM",
    evidence: ["pnpm-lock.yaml"]
  },
  frameworks: [],
  manifests: [],
  packages: [],
  dependencies: [],
  issues: [{ path: "package.json", code: "MISSING_MANIFEST_CONTENT" }]
};

const sourceStructures: SourceFileStructure[] = [
  {
    path: "src/z.ts",
    language: "TYPESCRIPT",
    imports: [],
    exports: [],
    declarations: [],
    issues: []
  },
  {
    path: "src/a.ts",
    language: "TYPESCRIPT",
    imports: [],
    exports: [],
    declarations: [],
    issues: [
      {
        code: "PARSE_ERROR",
        message: "Identifier expected."
      }
    ]
  }
];

const relationshipResult: RelationshipAnalysisResult = {
  relationships: [
    {
      sourcePath: "src/z.ts",
      kind: "IMPORTS",
      specifier: "./a",
      targetKind: "LOCAL_FILE",
      targetPath: "src/a.ts",
      targetPackageName: null,
      resolved: true,
      packageDependency: null,
      evidence: []
    },
    {
      sourcePath: "src/a.ts",
      kind: "IMPORTS",
      specifier: "./missing",
      targetKind: "UNRESOLVED",
      targetPath: null,
      targetPackageName: null,
      resolved: false,
      packageDependency: null,
      evidence: []
    }
  ],
  dependencies: [
    {
      sourcePath: "src/z.ts",
      kind: "IMPORTS",
      dependencyKind: "LOCAL_FILE",
      specifier: "./a",
      targetPath: "src/a.ts",
      packageName: null,
      resolved: true,
      packageDependency: null
    }
  ],
  issues: [
    {
      sourcePath: "src/a.ts",
      specifier: "./missing",
      code: "UNRESOLVED_LOCAL_MODULE"
    }
  ]
};

function createService(options: {
  order?: string[];
  files?: Awaited<ReturnType<FileClassificationService["classifyFiles"]>>;
  project?: ProjectProfile;
  source?: SourceFileStructure[];
  relationships?: RelationshipAnalysisResult;
  aggregation?: AnalysisResultAggregationService;
  classifyError?: Error;
}) {
  const order = options.order ?? [];
  const files = options.files ?? [
    { path: "src/z.ts", category: "SOURCE" as const },
    { path: "src/a.ts", category: "SOURCE" as const },
    { path: "README.md", category: "DOCUMENTATION" as const }
  ];
  const fileClassificationService = {
    classifyFiles: vi.fn(async (input: AnalysisInput) => {
      order.push("classification");
      if (options.classifyError) {
        throw options.classifyError;
      }

      expect(input).toBe(analysisInput);
      return files;
    })
  } as unknown as FileClassificationService;
  const projectDetectionService = {
    detectProject: vi.fn(async (input: AnalysisInput) => {
      order.push("project");
      expect(input).toBe(analysisInput);
      return options.project ?? projectProfile;
    })
  } as unknown as ProjectDetectionService;
  const sourceStructureAnalysisService = {
    analyzeSourceStructure: vi.fn(async (input: AnalysisInput) => {
      order.push("source");
      expect(input).toBe(analysisInput);
      return options.source ?? sourceStructures;
    })
  } as unknown as SourceStructureAnalysisService;
  const relationshipAnalysisService = {
    analyzeRelationshipsFromResults: vi.fn((input) => {
      order.push("relationships");
      expect(input).toEqual({
        sourceStructures: options.source ?? sourceStructures,
        projectProfile: options.project ?? projectProfile
      });
      return options.relationships ?? relationshipResult;
    })
  } as unknown as RelationshipAnalysisService;
  const aggregationService =
    options.aggregation ??
    ({
      aggregate: vi.fn((input) => {
        order.push("aggregation");
        return new AnalysisResultAggregationService().aggregate(input);
      })
    } as unknown as AnalysisResultAggregationService);

  return {
    service: new AnalysisPipelineService(
      fileClassificationService,
      projectDetectionService,
      sourceStructureAnalysisService,
      relationshipAnalysisService,
      aggregationService
    ),
    fileClassificationService,
    projectDetectionService,
    sourceStructureAnalysisService,
    relationshipAnalysisService,
    aggregationService,
    order
  };
}

describe("AnalysisPipelineService", () => {
  it("runs the existing analysis stages and returns a complete AnalysisResult", async () => {
    const { service } = createService({});

    const result = await service.analyze({
      analysis,
      input: analysisInput,
      generatedAt
    });

    expect(result).toMatchObject({
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      analyzerVersion: "analysis-4.8",
      generatedAt,
      files: [
        { path: "README.md", category: "DOCUMENTATION" },
        { path: "src/a.ts", category: "SOURCE" },
        { path: "src/z.ts", category: "SOURCE" }
      ],
      sourceStructures: [{ path: "src/a.ts" }, { path: "src/z.ts" }],
      relationships: [{ specifier: "./missing" }, { specifier: "./a" }],
      dependencies: [{ specifier: "./a" }]
    });
  });

  it("calls stages in the intended order and passes all stage outputs to aggregation", async () => {
    const order: string[] = [];
    const { service, aggregationService } = createService({ order });

    await service.analyze({
      analysis,
      input: analysisInput,
      generatedAt
    });

    expect(order).toEqual(["classification", "project", "source", "relationships", "aggregation"]);
    expect(aggregationService.aggregate).toHaveBeenCalledWith({
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      analysisId: "analysis_1",
      analyzerVersion: "analysis-4.8",
      generatedAt,
      files: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: [
          { path: "src/z.ts", category: "SOURCE" },
          { path: "src/a.ts", category: "SOURCE" },
          { path: "README.md", category: "DOCUMENTATION" }
        ]
      },
      project: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: projectProfile
      },
      sourceStructures: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: sourceStructures
      },
      relationships: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: relationshipResult
      }
    });
  });

  it("preserves structured analysis issues in the final result", async () => {
    const { service } = createService({});

    await expect(
      service.analyze({
        analysis,
        input: analysisInput,
        generatedAt
      })
    ).resolves.toMatchObject({
      issues: [
        {
          stage: "PROJECT_DETECTION",
          path: "package.json",
          code: "MISSING_MANIFEST_CONTENT"
        },
        {
          stage: "RELATIONSHIP_ANALYSIS",
          path: "src/a.ts",
          specifier: "./missing",
          code: "UNRESOLVED_LOCAL_MODULE"
        },
        {
          stage: "SOURCE_STRUCTURE",
          path: "src/a.ts",
          code: "PARSE_ERROR",
          message: "Identifier expected."
        }
      ]
    });
  });

  it("propagates fatal stage failures", async () => {
    const fatal = new Error("classification failed");
    const { service, projectDetectionService } = createService({ classifyError: fatal });

    await expect(
      service.analyze({
        analysis,
        input: analysisInput,
        generatedAt
      })
    ).rejects.toThrow(fatal);
    expect(projectDetectionService.detectProject).not.toHaveBeenCalled();
  });

  it("surfaces aggregation context failures", async () => {
    const expected = {
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123"
    };
    const actual = {
      scanId: "scan_2",
      repositoryId: "repository_1",
      commitSha: "abc123"
    };
    const aggregation = {
      aggregate: vi.fn(() => {
        throw new InconsistentAnalysisResultContextError(expected, actual, "relationships");
      })
    } as unknown as AnalysisResultAggregationService;
    const { service } = createService({ aggregation });

    await expect(
      service.analyze({
        analysis,
        input: analysisInput,
        generatedAt
      })
    ).rejects.toThrow(InconsistentAnalysisResultContextError);
  });

  it("rejects mismatched analysis and input scan identity", async () => {
    const { service } = createService({});
    const mismatchedAnalysis = Analysis.create({
      id: "analysis_2",
      scanId: "scan_2",
      analyzerVersion: "analysis-4.8"
    });

    await expect(
      service.analyze({
        analysis: mismatchedAnalysis,
        input: analysisInput,
        generatedAt
      })
    ).rejects.toThrow(InvalidAnalysisPipelineContextError);
  });

  it("handles empty repositories as valid analysis results", async () => {
    const { service } = createService({
      files: [],
      project: {
        ...projectProfile,
        ecosystems: [],
        languages: [],
        frameworks: [],
        issues: []
      },
      source: [],
      relationships: {
        relationships: [],
        dependencies: [],
        issues: []
      }
    });

    await expect(
      service.analyze({
        analysis,
        input: analysisInput,
        generatedAt
      })
    ).resolves.toMatchObject({
      files: [],
      sourceStructures: [],
      relationships: [],
      dependencies: [],
      issues: []
    });
  });

  it("is deterministic for identical stage outputs", async () => {
    const first = createService({});
    const second = createService({});
    const pipelineInput = {
      analysis,
      input: analysisInput,
      generatedAt
    };

    await expect(first.service.analyze(pipelineInput)).resolves.toEqual(
      await second.service.analyze(pipelineInput)
    );
  });
});
