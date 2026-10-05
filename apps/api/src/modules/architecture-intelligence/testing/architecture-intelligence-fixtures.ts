import { ANALYSIS_ENGINE_VERSION } from "../../analysis/application/analysis-engine-version.js";
import { CONTEXT_ENGINE_VERSION } from "../../context/application/context-engine-version.js";
import type { ArchitectureProcessingInput } from "../domain/contracts/architecture-processing-input-reader.contract.js";

export function moduleClaim(
  path: string,
  overrides: Record<string, unknown> = {},
  confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH"
) {
  return {
    kind: "INFERRED",
    confidence,
    evidence: [],
    value: {
      type: "MODULE_CANDIDATE",
      moduleId: `module:${path}`,
      name: path.split("/").at(-1),
      path,
      sourceFileCount: 2,
      declarationCount: 3,
      internalRelationshipCount: 1,
      incomingRelationshipCount: 1,
      outgoingRelationshipCount: 1,
      ...overrides
    }
  };
}

export function relationshipClaim(
  sourcePath: string,
  targetPath: string,
  overrides: Record<string, unknown> = {},
  confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH"
) {
  const sourceFile = `${sourcePath}/index.ts`;
  const targetSpecifier = `../${targetPath.split("/").at(-1)}/index.js`;
  return {
    claim: {
      kind: "INFERRED",
      confidence,
      evidence: [
        {
          kind: "RELATIONSHIP",
          reference: { kind: "RELATIONSHIP", sourcePath: sourceFile, specifier: targetSpecifier }
        }
      ],
      value: {
        type: "MODULE_RELATIONSHIP",
        sourceModuleId: `module:${sourcePath}`,
        targetModuleId: `module:${targetPath}`,
        relationshipCount: 1,
        ...overrides
      }
    },
    analysisRelationship: analysisRelationship(
      sourceFile,
      `${targetPath}/index.ts`,
      targetSpecifier
    )
  };
}

export function analysisRelationship(
  sourcePath: string,
  targetPath: string | null,
  specifier: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    sourcePath,
    kind: "IMPORTS",
    specifier,
    targetKind: "LOCAL_FILE",
    targetPath,
    targetPackageName: null,
    resolved: true,
    packageDependency: null,
    evidence: [
      {
        kind: "IMPORT_DECLARATION",
        location: {
          start: 0,
          end: 10,
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 11
        },
        names: [],
        typeOnly: false
      }
    ],
    ...overrides
  };
}

export function processingInput(
  claims: readonly unknown[],
  relationships: readonly unknown[],
  overrides: Partial<ArchitectureProcessingInput> = {}
): ArchitectureProcessingInput {
  return {
    repositoryId: "repository-1",
    projectContextId: "context-1",
    analysisId: "analysis-1",
    scanId: "scan-1",
    commitSha: "abc123",
    contextVersion: CONTEXT_ENGINE_VERSION,
    analyzerVersion: ANALYSIS_ENGINE_VERSION,
    architectureClaims: claims,
    analysisRelationships: relationships,
    ...overrides
  };
}
