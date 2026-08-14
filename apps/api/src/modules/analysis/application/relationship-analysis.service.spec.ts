import { describe, expect, it, vi } from "vitest";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type { ScanContentFile } from "../domain/contracts/scan-content-reader.contract.js";
import { TypeScriptSourceParser } from "../infrastructure/typescript-source.parser.js";
import { ProjectDetectionService } from "./project-detection.service.js";
import { RelationshipAnalysisService } from "./relationship-analysis.service.js";
import { SourceStructureAnalysisService } from "./source-structure-analysis.service.js";

function file(path: string, overrides: Partial<ScanContentFile> = {}): ScanContentFile {
  const filename = path.split("/").at(-1) ?? path;
  const dotIndex = filename.lastIndexOf(".");

  return {
    path,
    extension: dotIndex > 0 && dotIndex < filename.length - 1 ? filename.slice(dotIndex + 1) : null,
    size: 1n,
    sha: `${path}_sha`,
    isBinary: false,
    isHidden: false,
    ...overrides
  };
}

async function* listFiles(files: readonly ScanContentFile[]) {
  for (const item of files) {
    yield item;
  }
}

function createInput(
  files: readonly ScanContentFile[],
  content: Record<string, string | null>
): AnalysisInput & {
  contentReader: {
    listFiles: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
  };
} {
  const contentReader = {
    listFiles: vi.fn(() => listFiles(files)),
    readFile: vi.fn(async (_scanId: string, path: string) => {
      const value = content[path];

      return value === undefined || value === null
        ? null
        : {
            path,
            content: value
          };
    })
  };

  return {
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    contentReader
  };
}

describe("RelationshipAnalysisService", () => {
  it("analyzes relationships through AnalysisInput and ScanContentReader", async () => {
    const input = createInput(
      [
        file("package.json"),
        file("src/main.ts"),
        file("src/app.ts"),
        file("src/index.ts"),
        file("README.md"),
        file("public/logo.png", { isBinary: true }),
        file("dist/generated.ts"),
        file("pnpm-lock.yaml")
      ],
      {
        "package.json": JSON.stringify({
          name: "relationship-test",
          dependencies: {
            react: "^19.0.0"
          }
        }),
        "src/main.ts": `
          import { app } from "./app";
          import React from "react";
          export { app } from "./app";
        `,
        "src/app.ts": "export const app = true;",
        "src/index.ts": "export * from './app';"
      }
    );
    const service = new RelationshipAnalysisService(
      new SourceStructureAnalysisService(new TypeScriptSourceParser()),
      new ProjectDetectionService()
    );

    const result = await service.analyzeRelationships(input);

    expect(result.relationships).toMatchObject([
      {
        sourcePath: "src/index.ts",
        kind: "RE_EXPORTS",
        specifier: "./app",
        targetPath: "src/app.ts"
      },
      {
        sourcePath: "src/main.ts",
        kind: "IMPORTS",
        specifier: "./app",
        targetPath: "src/app.ts"
      },
      {
        sourcePath: "src/main.ts",
        kind: "IMPORTS",
        specifier: "react",
        targetKind: "PACKAGE",
        targetPackageName: "react",
        resolved: true
      },
      {
        sourcePath: "src/main.ts",
        kind: "RE_EXPORTS",
        specifier: "./app",
        targetPath: "src/app.ts"
      }
    ]);
    expect(result.dependencies).toMatchObject([
      {
        sourcePath: "src/index.ts",
        dependencyKind: "LOCAL_FILE",
        targetPath: "src/app.ts"
      },
      {
        sourcePath: "src/main.ts",
        dependencyKind: "LOCAL_FILE",
        targetPath: "src/app.ts"
      },
      {
        sourcePath: "src/main.ts",
        dependencyKind: "PACKAGE",
        packageName: "react",
        resolved: true
      },
      {
        sourcePath: "src/main.ts",
        dependencyKind: "LOCAL_FILE",
        targetPath: "src/app.ts"
      }
    ]);
    expect(input.contentReader.listFiles).toHaveBeenCalledTimes(2);
    expect(input.contentReader.readFile).toHaveBeenCalledWith("scan_1", "package.json");
    expect(input.contentReader.readFile).toHaveBeenCalledWith("scan_1", "src/main.ts");
    expect(input.contentReader.readFile).toHaveBeenCalledWith("scan_1", "src/app.ts");
    expect(input.contentReader.readFile).toHaveBeenCalledWith("scan_1", "src/index.ts");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "README.md");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "public/logo.png");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "dist/generated.ts");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "pnpm-lock.yaml");
  });

  it("keeps malformed file issues isolated while analyzing other source files", async () => {
    const input = createInput([file("src/good.ts"), file("src/broken.ts"), file("src/target.ts")], {
      "src/good.ts": "import './target';",
      "src/broken.ts": "import {",
      "src/target.ts": "export const target = true;"
    });
    const service = new RelationshipAnalysisService(
      new SourceStructureAnalysisService(new TypeScriptSourceParser()),
      new ProjectDetectionService()
    );

    await expect(service.analyzeRelationships(input)).resolves.toMatchObject({
      relationships: [
        {
          sourcePath: "src/good.ts",
          specifier: "./target",
          targetPath: "src/target.ts",
          resolved: true
        }
      ],
      issues: []
    });
  });
});
