import { Injectable } from "@nestjs/common";

import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type {
  DetectedFramework,
  PackageDependency,
  ProjectEcosystem,
  ProjectFramework,
  ProjectLanguage
} from "../../analysis/domain/project-detection/project-profile.js";
import type { ContextClaim, ContextEvidence } from "../domain/context-claim.js";
import type { ContextGenerator } from "../domain/contracts/context-generator.contract.js";
import type { ContextInput } from "../domain/contracts/context-input.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import { CONTEXT_ENGINE_VERSION } from "./context-engine-version.js";

export type ProjectApplicationType = "BACKEND" | "FRONTEND" | "FULLSTACK";

type ProjectIdentityClaimValue =
  | {
      type: "APPLICATION_TYPE";
      applicationType: ProjectApplicationType;
    }
  | {
      type: "PRIMARY_LANGUAGE";
      language: ProjectLanguage;
    };

type TechnologyClaimValue =
  | {
      type: "ECOSYSTEM";
      ecosystem: ProjectEcosystem;
    }
  | {
      type: "LANGUAGE";
      language: ProjectLanguage;
      fileCount: number;
    }
  | {
      type: "FRAMEWORK";
      framework: ProjectFramework;
    }
  | {
      type: "PACKAGE_MANAGER";
      packageManager: "PNPM" | "NPM" | "YARN";
    }
  | {
      type: "DEPENDENCY";
      name: string;
      dependencyType: PackageDependency["type"];
    };

@Injectable()
export class DeterministicContextGenerator implements ContextGenerator {
  async generate(input: ContextInput): Promise<ProjectContext> {
    const analysis = input.analysis;

    return ProjectContext.create({
      contextId: this.contextId(analysis),
      analysisId: analysis.analysisId,
      scanId: analysis.scanId,
      repositoryId: analysis.repositoryId,
      commitSha: analysis.commitSha,
      contextVersion: CONTEXT_ENGINE_VERSION,
      generatedAt: new Date(),
      project: {
        claims: this.projectClaims(analysis)
      },
      technology: {
        claims: this.technologyClaims(analysis)
      }
    });
  }

  private contextId(analysis: AnalysisResult): string {
    return `context:${analysis.analysisId}:${CONTEXT_ENGINE_VERSION}`;
  }

  private projectClaims(analysis: AnalysisResult): ContextClaim<ProjectIdentityClaimValue>[] {
    return [...this.applicationTypeClaims(analysis), ...this.primaryLanguageClaims(analysis)];
  }

  private technologyClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [
      ...this.ecosystemClaims(analysis),
      ...this.languageClaims(analysis),
      ...this.frameworkClaims(analysis),
      ...this.packageManagerClaims(analysis),
      ...this.dependencyClaims(analysis)
    ];
  }

  private applicationTypeClaims(
    analysis: AnalysisResult
  ): ContextClaim<ProjectIdentityClaimValue>[] {
    const frameworks = new Set(analysis.project.frameworks.map((framework) => framework.framework));
    const hasBackend = frameworks.has("NESTJS");
    const hasFrontend = frameworks.has("REACT") || frameworks.has("NEXT_JS");

    if (!hasBackend && !hasFrontend) {
      return [];
    }

    const applicationType: ProjectApplicationType =
      hasBackend && hasFrontend ? "FULLSTACK" : hasBackend ? "BACKEND" : "FRONTEND";

    return [
      {
        value: {
          type: "APPLICATION_TYPE",
          applicationType
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: this.frameworkEvidence(analysis.project.frameworks)
      }
    ];
  }

  private primaryLanguageClaims(
    analysis: AnalysisResult
  ): ContextClaim<ProjectIdentityClaimValue>[] {
    if (analysis.project.languages.length === 0) {
      return [];
    }

    const sortedLanguages = [...analysis.project.languages].sort(
      (left, right) =>
        right.fileCount - left.fileCount || left.language.localeCompare(right.language)
    );
    const [primary, secondary] = sortedLanguages;

    if (!primary) {
      return [];
    }

    const hasTie = secondary !== undefined && secondary.fileCount === primary.fileCount;

    return [
      {
        value: {
          type: "PRIMARY_LANGUAGE",
          language: primary.language
        },
        kind: "INFERRED",
        confidence: hasTie ? "MEDIUM" : "HIGH",
        evidence: [projectMetadataEvidence("project.languages")]
      }
    ];
  }

  private ecosystemClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.ecosystems].sort().map((ecosystem) => ({
      value: {
        type: "ECOSYSTEM",
        ecosystem
      },
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: [projectMetadataEvidence("project.ecosystems")]
    }));
  }

  private languageClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.languages]
      .sort(
        (left, right) =>
          right.fileCount - left.fileCount || left.language.localeCompare(right.language)
      )
      .map((language) => ({
        value: {
          type: "LANGUAGE",
          language: language.language,
          fileCount: language.fileCount
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [projectMetadataEvidence("project.languages")]
      }));
  }

  private frameworkClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.frameworks]
      .sort((left, right) => left.framework.localeCompare(right.framework))
      .map((framework) => ({
        value: {
          type: "FRAMEWORK",
          framework: framework.framework
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          projectMetadataEvidence("project.frameworks"),
          ...framework.evidence.map((evidence) => frameworkEvidenceReference(evidence))
        ].sort(compareEvidence)
      }));
  }

  private packageManagerClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    const packageManager = analysis.project.packageManager;

    if (packageManager.status !== "DETECTED") {
      return [];
    }

    return [
      {
        value: {
          type: "PACKAGE_MANAGER",
          packageManager: packageManager.packageManager
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          projectMetadataEvidence("project.packageManager"),
          ...packageManager.evidence.map((path) => manifestEvidence(path))
        ].sort(compareEvidence)
      }
    ];
  }

  private dependencyClaims(analysis: AnalysisResult): ContextClaim<TechnologyClaimValue>[] {
    return [...analysis.project.dependencies]
      .filter((dependency) => dependency.type === "DEPENDENCY")
      .sort(compareDependencies)
      .map((dependency) => ({
        value: {
          type: "DEPENDENCY",
          name: dependency.name,
          dependencyType: dependency.type
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [dependencyEvidence(dependency)]
      }));
  }

  private frameworkEvidence(frameworks: readonly DetectedFramework[]): ContextEvidence[] {
    return [
      projectMetadataEvidence("project.frameworks"),
      ...frameworks.flatMap((framework) =>
        framework.evidence.map((evidence) => frameworkEvidenceReference(evidence))
      )
    ].sort(compareEvidence);
  }
}

function projectMetadataEvidence(field: string): ContextEvidence {
  return {
    kind: "PROJECT_METADATA",
    reference: {
      kind: "PROJECT_METADATA",
      field
    }
  };
}

function manifestEvidence(path: string): ContextEvidence {
  return {
    kind: "MANIFEST",
    reference: {
      kind: "MANIFEST",
      path
    }
  };
}

function dependencyEvidence(dependency: PackageDependency): ContextEvidence {
  return {
    kind: "DEPENDENCY",
    reference: {
      kind: "DEPENDENCY",
      manifestPath: dependency.manifestPath,
      name: dependency.name
    }
  };
}

function frameworkEvidenceReference(evidence: string): ContextEvidence {
  const separatorIndex = evidence.lastIndexOf(":");

  if (separatorIndex <= 0 || separatorIndex === evidence.length - 1) {
    return projectMetadataEvidence("project.frameworks.evidence");
  }

  return {
    kind: "DEPENDENCY",
    reference: {
      kind: "DEPENDENCY",
      manifestPath: evidence.slice(0, separatorIndex),
      name: evidence.slice(separatorIndex + 1)
    }
  };
}

function compareDependencies(left: PackageDependency, right: PackageDependency): number {
  return (
    left.manifestPath.localeCompare(right.manifestPath) ||
    left.name.localeCompare(right.name) ||
    left.type.localeCompare(right.type)
  );
}

function compareEvidence(left: ContextEvidence, right: ContextEvidence): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}
