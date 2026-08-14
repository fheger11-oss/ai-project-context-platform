import { describe, expect, it, vi } from "vitest";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type { SourceParser } from "../domain/contracts/source-parser.contract.js";
import type { ScanContentFile } from "../domain/contracts/scan-content-reader.contract.js";
import { TypeScriptSourceParser } from "../infrastructure/typescript-source.parser.js";
import { SourceStructureAnalysisService } from "./source-structure-analysis.service.js";

function file(path: string, overrides: Partial<ScanContentFile> = {}): ScanContentFile {
  const filename = path.split("/").at(-1) ?? path;
  const dotIndex = filename.lastIndexOf(".");

  return {
    path,
    extension:
      dotIndex > 0 && dotIndex < filename.length - 1
        ? filename.slice(dotIndex + 1).toLowerCase()
        : null,
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
  content: Record<string, string>
): AnalysisInput & {
  contentReader: {
    listFiles: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
  };
} {
  const contentReader = {
    listFiles: vi.fn().mockReturnValue(listFiles(files)),
    readFile: vi.fn(async (_scanId: string, path: string) => ({
      path,
      content: content[path] ?? ""
    }))
  };

  return {
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    contentReader
  };
}

describe("SourceStructureAnalysisService", () => {
  it("reads and parses only supported source and test files", async () => {
    const files = [
      file("src/main.ts"),
      file("src/view.tsx"),
      file("src/index.js"),
      file("src/component.jsx"),
      file("src/module.mts"),
      file("src/module.cts"),
      file("src/module.mjs"),
      file("src/module.cjs"),
      file("src/main.test.ts"),
      file("README.md"),
      file("package.json"),
      file("logo.png", { isBinary: true }),
      file("pnpm-lock.yaml"),
      file("dist/generated.ts"),
      file("vite.config.ts")
    ];
    const input = createInput(files, {
      "src/main.ts": "export const main = 1;",
      "src/view.tsx": "const view = <div />;",
      "src/index.js": "export function run() {}",
      "src/component.jsx": "const component = <div />;",
      "src/module.mts": "export const mts: string = 'mts';",
      "src/module.cts": "export const cts: string = 'cts';",
      "src/module.mjs": "export const mjs = 'mjs';",
      "src/module.cjs": "const cjs = 'cjs';",
      "src/main.test.ts": "function testCase() {}"
    });
    const service = new SourceStructureAnalysisService(new TypeScriptSourceParser());

    const structures = await service.analyzeSourceStructure(input);

    expect(structures.map((structure) => structure.path)).toEqual([
      "src/main.ts",
      "src/view.tsx",
      "src/index.js",
      "src/component.jsx",
      "src/module.mts",
      "src/module.cts",
      "src/module.mjs",
      "src/module.cjs",
      "src/main.test.ts"
    ]);
    expect(input.contentReader.readFile).toHaveBeenCalledTimes(9);
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "README.md");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "package.json");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "logo.png");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "pnpm-lock.yaml");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "dist/generated.ts");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "vite.config.ts");
  });

  it("isolates malformed source issues to the malformed file", async () => {
    const input = createInput([file("src/good.ts"), file("src/broken.ts")], {
      "src/good.ts": "export const good = true;",
      "src/broken.ts": "function {"
    });
    const service = new SourceStructureAnalysisService(new TypeScriptSourceParser());

    const structures = await service.analyzeSourceStructure(input);

    expect(structures).toHaveLength(2);
    expect(structures[0]?.issues).toEqual([]);
    expect(structures[1]?.path).toBe("src/broken.ts");
    expect(structures[1]?.issues).toEqual([
      {
        code: "PARSE_ERROR",
        message: "Identifier expected."
      },
      {
        code: "PARSE_ERROR",
        message: "'}' expected."
      }
    ]);
  });

  it("does not crash when selected source content is missing", async () => {
    const contentReader = {
      listFiles: vi.fn().mockReturnValue(listFiles([file("src/main.ts")])),
      readFile: vi.fn().mockResolvedValue(null)
    };
    const input: AnalysisInput = {
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contentReader
    };
    const service = new SourceStructureAnalysisService(new TypeScriptSourceParser());

    await expect(service.analyzeSourceStructure(input)).resolves.toEqual([]);
  });

  it("is deterministic for identical scan input", async () => {
    const files = [file("src/main.ts")];
    const content = { "src/main.ts": "export const value = 1;" };
    const service = new SourceStructureAnalysisService(new TypeScriptSourceParser());

    await expect(service.analyzeSourceStructure(createInput(files, content))).resolves.toEqual(
      await service.analyzeSourceStructure(createInput(files, content))
    );
  });

  it("can be tested against the SourceParser contract without compiler nodes leaking", async () => {
    const sourceParser = {
      parse: vi.fn((input) => ({
        path: input.path,
        language: input.language,
        imports: [],
        exports: [],
        declarations: [],
        issues: []
      }))
    } satisfies SourceParser;
    const input = createInput([file("src/main.ts")], {
      "src/main.ts": "export const value = 1;"
    });
    const service = new SourceStructureAnalysisService(sourceParser);

    await expect(service.analyzeSourceStructure(input)).resolves.toEqual([
      {
        path: "src/main.ts",
        language: "TYPESCRIPT",
        imports: [],
        exports: [],
        declarations: [],
        issues: []
      }
    ]);
    expect(sourceParser.parse).toHaveBeenCalledWith({
      path: "src/main.ts",
      language: "TYPESCRIPT",
      content: "export const value = 1;"
    });
  });
});
