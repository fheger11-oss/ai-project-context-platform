export const COMPLETED_SCAN_RESOLVER = Symbol("COMPLETED_SCAN_RESOLVER");

export type CompletedScanReference = {
  scanId: string;
  repositoryId: string;
  commitSha: string;
};

export interface CompletedScanResolver {
  resolveCompletedScan(scanId: string): Promise<CompletedScanReference | null>;
}
