import { describe, expect, expectTypeOf, it } from "vitest";

import type { Analysis } from "./analysis.js";
import type { AnalysisInput } from "./contracts/analysis-input.contract.js";
import type { AnalysisRepository } from "./contracts/analysis-repository.contract.js";
import type { AnalysisResult } from "./contracts/analysis-result.contract.js";
import type {
  CompletedScanReference,
  CompletedScanResolver
} from "./contracts/completed-scan-resolver.contract.js";
import type {
  ScanContentFile,
  ScanContentReader,
  ScannedFileContent
} from "./contracts/scan-content-reader.contract.js";

describe("Analysis contracts", () => {
  async function collectFiles(files: AsyncIterable<ScanContentFile>): Promise<ScanContentFile[]> {
    const collected: ScanContentFile[] = [];

    for await (const file of files) {
      collected.push(file);
    }

    return collected;
  }

  it("keeps AnalysisRepository persistence-neutral", () => {
    expectTypeOf<AnalysisRepository>().toMatchTypeOf<{
      save(analysis: Analysis): Promise<Analysis>;
      findById(analysisId: string): Promise<Analysis | null>;
      findByScanId(scanId: string): Promise<Analysis | null>;
    }>();
  });

  it("models analysis input around a completed scan snapshot and content reader", () => {
    expectTypeOf<AnalysisInput>().toEqualTypeOf<{
      scanId: string;
      repositoryId: string;
      commitSha: string;
      contentReader: ScanContentReader;
    }>();
  });

  it("models completed scan resolution without exposing Scan persistence details", () => {
    expectTypeOf<CompletedScanReference>().toEqualTypeOf<{
      scanId: string;
      repositoryId: string;
      commitSha: string;
    }>();
    expectTypeOf<CompletedScanResolver>().toMatchTypeOf<{
      resolveCompletedScan(scanId: string): Promise<CompletedScanReference | null>;
    }>();
  });

  it("does not require credentials or transport values in AnalysisInput", () => {
    expectTypeOf<AnalysisInput>().not.toHaveProperty("authorization");
    expectTypeOf<AnalysisInput>().not.toHaveProperty("credential");
    expectTypeOf<AnalysisInput>().not.toHaveProperty("token");
    expectTypeOf<AnalysisInput>().not.toHaveProperty("request");
    expectTypeOf<AnalysisInput>().not.toHaveProperty("headers");
  });

  it("streams scan file metadata and reads content through a scan-content abstraction", async () => {
    const files: ScanContentFile[] = [
      {
        path: "src/main.ts",
        extension: "ts",
        size: 42n,
        sha: "file_sha",
        isBinary: false,
        isHidden: false
      }
    ];
    const content: ScannedFileContent = {
      path: "src/main.ts",
      content: "export const value = 1;"
    };
    const reader: ScanContentReader = {
      async *listFiles(scanId: string) {
        expect(scanId).toBe("scan_1");
        yield* files;
      },
      async readFile(scanId: string, path: string) {
        expect(scanId).toBe("scan_1");
        expect(path).toBe("src/main.ts");

        return content;
      }
    };

    await expect(collectFiles(reader.listFiles("scan_1"))).resolves.toEqual(files);
    await expect(reader.readFile("scan_1", "src/main.ts")).resolves.toEqual(content);
  });

  it("keeps AnalysisResult as a minimal persistence-neutral result boundary", () => {
    expectTypeOf<AnalysisResult>().toEqualTypeOf<{
      analysisId: string;
      scanId: string;
      analyzerVersion: string;
      generatedAt: Date;
    }>();
  });
});
