import type {
  ContextClaim,
  ContextClaimKind,
  ContextConfidence,
  ContextEvidence
} from "../../context/domain/context-claim.js";

export const CANONICAL_AI_EXPORT_SECTION_ORDER = [
  "project",
  "technology",
  "structure",
  "architecture",
  "entryPoints",
  "testing",
  "infrastructure"
] as const;

export type CanonicalAiExportSectionKey = (typeof CANONICAL_AI_EXPORT_SECTION_ORDER)[number];

export type CanonicalAiExportMetadata = {
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: string;
  exportVersion: string;
};

export type CanonicalAiExportClaim = {
  type?: string;
  value: ContextClaim["value"];
  kind: ContextClaimKind;
  confidence: ContextConfidence;
  evidence: readonly ContextEvidence[];
};

export type CanonicalAiExportSection = {
  key: CanonicalAiExportSectionKey;
  title: string;
  claims: readonly CanonicalAiExportClaim[];
};

export type CanonicalAiExportSummary = {
  sectionCount: number;
  populatedSectionCount: number;
  sectionClaimCount: number;
  ambiguityCount: number;
  totalClaimCount: number;
  observedClaimCount: number;
  inferredClaimCount: number;
  evidenceCount: number;
};

export type CanonicalAiExport = {
  metadata: CanonicalAiExportMetadata;
  sections: readonly CanonicalAiExportSection[];
  ambiguities: readonly CanonicalAiExportClaim[];
  summary: CanonicalAiExportSummary;
};
