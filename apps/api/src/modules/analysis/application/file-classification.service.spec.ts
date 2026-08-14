import { describe, expect, it, vi } from "vitest";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type { ScanContentFile } from "../domain/contracts/scan-content-reader.contract.js";
import { FileClassificationService } from "./file-classification.service.js";

const files: ScanContentFile[] = [
  {
    path: "src/main.ts",
    extension: "ts",
    size: 10n,
    sha: "main_sha",
    isBinary: false,
    isHidden: false
  },
  {
    path: "src/main.test.ts",
    extension: "ts",
    size: 12n,
    sha: "test_sha",
    isBinary: false,
    isHidden: false
  },
  {
    path: "README.md",
    extension: "md",
    size: 8n,
    sha: "readme_sha",
    isBinary: false,
    isHidden: false
  }
];

async function* listFiles() {
  for (const file of files) {
    yield file;
  }
}

describe("FileClassificationService", () => {
  it("classifies files from AnalysisInput using only ScanContentReader metadata", async () => {
    const contentReader = {
      listFiles: vi.fn().mockReturnValue(listFiles()),
      readFile: vi.fn()
    };
    const input: AnalysisInput = {
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contentReader
    };
    const service = new FileClassificationService();

    await expect(service.classifyFiles(input)).resolves.toEqual([
      { path: "src/main.ts", category: "SOURCE" },
      { path: "src/main.test.ts", category: "TEST" },
      { path: "README.md", category: "DOCUMENTATION" }
    ]);
    expect(contentReader.listFiles).toHaveBeenCalledWith("scan_1");
    expect(contentReader.readFile).not.toHaveBeenCalled();
  });
});
