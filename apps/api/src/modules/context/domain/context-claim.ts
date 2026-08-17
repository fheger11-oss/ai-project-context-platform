import type { AnalysisIssueStage } from "../../analysis/domain/contracts/analysis-result.contract.js";

export type ContextClaimKind = "OBSERVED" | "INFERRED";

export type ContextConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ContextEvidenceKind =
  | "PROJECT_METADATA"
  | "MANIFEST"
  | "DEPENDENCY"
  | "FILE_CLASSIFICATION"
  | "SOURCE_STRUCTURE"
  | "RELATIONSHIP"
  | "ISSUE";

export type ContextEvidenceReference =
  | {
      kind: "PROJECT_METADATA";
      field: string;
    }
  | {
      kind: "MANIFEST";
      path: string;
    }
  | {
      kind: "DEPENDENCY";
      manifestPath: string;
      name: string;
    }
  | {
      kind: "FILE_CLASSIFICATION";
      path: string;
    }
  | {
      kind: "SOURCE_STRUCTURE";
      path: string;
    }
  | {
      kind: "RELATIONSHIP";
      sourcePath: string;
      specifier: string;
    }
  | {
      kind: "ISSUE";
      stage: AnalysisIssueStage;
      path: string;
      code: string;
    };

export type ContextEvidence = {
  kind: ContextEvidenceKind;
  reference: ContextEvidenceReference;
};

export type ContextClaim<TValue = string> = {
  value: TValue;
  kind: ContextClaimKind;
  confidence: ContextConfidence;
  evidence: readonly ContextEvidence[];
};
