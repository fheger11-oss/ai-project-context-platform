import type { RepositoryVisibility, ScanStatus } from "./index.js";

export type DashboardProjectRepositorySummary = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  visibility: RepositoryVisibility;
  language: string | null;
  isArchived: boolean;
  lastSyncedAt: string;
};

export type DashboardProjectLatestScanSummary = {
  id: string;
  status: ScanStatus;
  commitSha: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  totalFiles: number;
  totalSize: string;
};

export type DashboardProjectLatestAnalysisSummary = {
  analysisId: string;
  scanId: string;
  analyzerVersion: string;
  commitSha: string;
  generatedAt: string;
};

export type DashboardProjectLatestContextSummary = {
  id: string;
  contextId: string;
  contextVersion: string;
  generatedAt: string;
  createdAt: string;
};

export type DashboardProjectDocumentsSummary = {
  available: boolean;
  count: number;
};

export type DashboardProjectAiExportSummary = {
  available: boolean;
};

export type DashboardProjectSummary = {
  repository: DashboardProjectRepositorySummary;
  latestScan: DashboardProjectLatestScanSummary | null;
  latestAnalysis: DashboardProjectLatestAnalysisSummary | null;
  latestContext: DashboardProjectLatestContextSummary | null;
  documents: DashboardProjectDocumentsSummary;
  aiExport: DashboardProjectAiExportSummary;
};

export type DashboardProjectsResponse = {
  projects: DashboardProjectSummary[];
};
