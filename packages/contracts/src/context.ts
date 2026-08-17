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
      stage: string;
      path: string;
      code: string;
    };

export type ContextEvidence = {
  kind: ContextEvidenceKind;
  reference: ContextEvidenceReference;
};

export type ContextClaim<TValue = unknown> = {
  value: TValue;
  kind: ContextClaimKind;
  confidence: ContextConfidence;
  evidence: readonly ContextEvidence[];
};

export type ContextSection = {
  claims: readonly ContextClaim[];
};

export type ProjectContextResponse = {
  id: string;
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: string;
  createdAt: string;
  project: ContextSection;
  technology: ContextSection;
  structure: ContextSection;
  architecture: ContextSection;
  entryPoints: ContextSection;
  testing: ContextSection;
  infrastructure: ContextSection;
  ambiguities: readonly ContextClaim[];
};

export type ProjectContextHistoryItem = {
  id: string;
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: string;
  createdAt: string;
};

export type ProjectContextHistoryResponse = {
  items: readonly ProjectContextHistoryItem[];
};

export type GenerateProjectContextResponse = ProjectContextResponse;
