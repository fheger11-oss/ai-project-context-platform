export const SCAN_CONTENT_READER = Symbol("SCAN_CONTENT_READER");

export type ScanContentFile = {
  path: string;
  extension: string | null;
  size: bigint;
  sha: string;
  isBinary: boolean;
  isHidden: boolean;
};

export type ScannedFileContent = {
  path: string;
  content: string;
};

export interface ScanContentReader {
  listFiles(scanId: string): AsyncIterable<ScanContentFile>;
  readFile(scanId: string, path: string): Promise<ScannedFileContent | null>;
}
