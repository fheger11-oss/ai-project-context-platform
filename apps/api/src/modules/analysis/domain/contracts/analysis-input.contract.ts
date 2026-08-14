import type { ScanContentReader } from "./scan-content-reader.contract.js";

export type AnalysisInput = {
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contentReader: ScanContentReader;
};
