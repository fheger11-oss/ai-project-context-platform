import { describe, expect, it, vi } from "vitest";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type { ScanContentFile } from "../domain/contracts/scan-content-reader.contract.js";
import { ProjectDetectionService } from "./project-detection.service.js";

function file(path: string): ScanContentFile {
  const filename = path.split("/").at(-1) ?? path;
  const dotIndex = filename.lastIndexOf(".");

  return {
    path,
    extension: dotIndex > 0 && dotIndex < filename.length - 1 ? filename.slice(dotIndex + 1) : null,
    size: 1n,
    sha: `${path}_sha`,
    isBinary: false,
    isHidden: false
  };
}

async function* listFiles(files: readonly ScanContentFile[]) {
  for (const item of files) {
    yield item;
  }
}

function createInput(options?: {
  files?: readonly ScanContentFile[];
  content?: Record<string, string | null>;
}): AnalysisInput & {
  contentReader: {
    listFiles: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
  };
} {
  const files = options?.files ?? [
    file("package.json"),
    file("apps/api/package.json"),
    file("apps/web/package.json"),
    file("pnpm-lock.yaml"),
    file("tsconfig.json"),
    file("src/main.ts"),
    file("src/index.js"),
    file("README.md"),
    file("src/styles.css"),
    file("public/index.html")
  ];
  const content = options?.content ?? {
    "package.json": JSON.stringify({
      name: "root",
      version: "0.1.0",
      dependencies: {
        react: "^19.0.0"
      },
      devDependencies: {
        typescript: "^5.0.0"
      }
    }),
    "apps/api/package.json": JSON.stringify({
      name: "api",
      dependencies: {
        "@nestjs/core": "^11.0.0"
      },
      devDependencies: {
        vitest: "^4.0.0"
      }
    }),
    "apps/web/package.json": JSON.stringify({
      name: "web",
      dependencies: {
        next: "^15.0.0"
      },
      peerDependencies: {
        react: "^19.0.0"
      }
    })
  };
  const contentReader = {
    listFiles: vi.fn().mockReturnValue(listFiles(files)),
    readFile: vi.fn(async (_scanId: string, path: string) => {
      const item = content[path];

      return item === undefined || item === null
        ? null
        : {
            path,
            content: item
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

describe("ProjectDetectionService", () => {
  it("detects project profile from scan metadata and supported manifests", async () => {
    const input = createInput();
    const service = new ProjectDetectionService();

    await expect(service.detectProject(input)).resolves.toEqual({
      ecosystems: ["NODE_JS", "TYPESCRIPT", "JAVASCRIPT"],
      languages: [
        { language: "TYPESCRIPT", fileCount: 1 },
        { language: "JAVASCRIPT", fileCount: 1 },
        { language: "JSON", fileCount: 4 },
        { language: "CSS", fileCount: 1 },
        { language: "HTML", fileCount: 1 },
        { language: "MARKDOWN", fileCount: 1 }
      ],
      packageManager: {
        status: "DETECTED",
        packageManager: "PNPM",
        evidence: ["pnpm-lock.yaml"]
      },
      frameworks: [
        { framework: "NESTJS", evidence: ["apps/api/package.json:@nestjs/core"] },
        { framework: "NEXT_JS", evidence: ["apps/web/package.json:next"] },
        {
          framework: "REACT",
          evidence: ["apps/web/package.json:react", "package.json:react"]
        }
      ],
      manifests: [
        { path: "package.json", type: "PACKAGE_JSON", isPrimary: true },
        { path: "pnpm-lock.yaml", type: "PNPM_LOCK", isPrimary: false },
        { path: "tsconfig.json", type: "TSCONFIG", isPrimary: false },
        { path: "apps/api/package.json", type: "PACKAGE_JSON", isPrimary: false },
        { path: "apps/web/package.json", type: "PACKAGE_JSON", isPrimary: false }
      ],
      packages: [
        {
          path: "package.json",
          isPrimary: true,
          name: "root",
          version: "0.1.0",
          dependencies: [
            {
              manifestPath: "package.json",
              name: "react",
              version: "^19.0.0",
              type: "DEPENDENCY"
            },
            {
              manifestPath: "package.json",
              name: "typescript",
              version: "^5.0.0",
              type: "DEV_DEPENDENCY"
            }
          ]
        },
        {
          path: "apps/api/package.json",
          isPrimary: false,
          name: "api",
          version: null,
          dependencies: [
            {
              manifestPath: "apps/api/package.json",
              name: "@nestjs/core",
              version: "^11.0.0",
              type: "DEPENDENCY"
            },
            {
              manifestPath: "apps/api/package.json",
              name: "vitest",
              version: "^4.0.0",
              type: "DEV_DEPENDENCY"
            }
          ]
        },
        {
          path: "apps/web/package.json",
          isPrimary: false,
          name: "web",
          version: null,
          dependencies: [
            {
              manifestPath: "apps/web/package.json",
              name: "next",
              version: "^15.0.0",
              type: "DEPENDENCY"
            },
            {
              manifestPath: "apps/web/package.json",
              name: "react",
              version: "^19.0.0",
              type: "PEER_DEPENDENCY"
            }
          ]
        }
      ],
      dependencies: [
        {
          manifestPath: "package.json",
          name: "react",
          version: "^19.0.0",
          type: "DEPENDENCY"
        },
        {
          manifestPath: "package.json",
          name: "typescript",
          version: "^5.0.0",
          type: "DEV_DEPENDENCY"
        },
        {
          manifestPath: "apps/api/package.json",
          name: "@nestjs/core",
          version: "^11.0.0",
          type: "DEPENDENCY"
        },
        {
          manifestPath: "apps/api/package.json",
          name: "vitest",
          version: "^4.0.0",
          type: "DEV_DEPENDENCY"
        },
        {
          manifestPath: "apps/web/package.json",
          name: "next",
          version: "^15.0.0",
          type: "DEPENDENCY"
        },
        {
          manifestPath: "apps/web/package.json",
          name: "react",
          version: "^19.0.0",
          type: "PEER_DEPENDENCY"
        }
      ],
      issues: []
    });

    expect(input.contentReader.listFiles).toHaveBeenCalledWith("scan_1");
    expect(input.contentReader.readFile).toHaveBeenCalledTimes(3);
    expect(input.contentReader.readFile).toHaveBeenCalledWith("scan_1", "package.json");
    expect(input.contentReader.readFile).toHaveBeenCalledWith("scan_1", "apps/api/package.json");
    expect(input.contentReader.readFile).toHaveBeenCalledWith("scan_1", "apps/web/package.json");
    expect(input.contentReader.readFile).not.toHaveBeenCalledWith("scan_1", "src/main.ts");
  });

  it("handles missing package.json safely", async () => {
    const input = createInput({
      files: [file("src/main.ts"), file("README.md")]
    });
    const service = new ProjectDetectionService();

    await expect(service.detectProject(input)).resolves.toMatchObject({
      ecosystems: ["TYPESCRIPT"],
      packageManager: {
        status: "UNKNOWN",
        evidence: []
      },
      manifests: [],
      packages: [],
      dependencies: [],
      issues: []
    });
    expect(input.contentReader.readFile).not.toHaveBeenCalled();
  });

  it("handles malformed package.json deterministically", async () => {
    const input = createInput({
      files: [file("package.json"), file("package-lock.json")],
      content: {
        "package.json": "{not-json"
      }
    });
    const service = new ProjectDetectionService();

    await expect(service.detectProject(input)).resolves.toMatchObject({
      packageManager: {
        status: "DETECTED",
        packageManager: "NPM",
        evidence: ["package-lock.json"]
      },
      packages: [],
      dependencies: [],
      issues: [
        {
          path: "package.json",
          code: "MALFORMED_PACKAGE_JSON"
        }
      ]
    });
  });

  it("reports missing manifest content without crashing", async () => {
    const input = createInput({
      files: [file("package.json")],
      content: {
        "package.json": null
      }
    });
    const service = new ProjectDetectionService();

    await expect(service.detectProject(input)).resolves.toMatchObject({
      packages: [],
      dependencies: [],
      issues: [
        {
          path: "package.json",
          code: "MISSING_MANIFEST_CONTENT"
        }
      ]
    });
  });

  it("is deterministic for the same scan input", async () => {
    const service = new ProjectDetectionService();
    const firstInput = createInput();
    const secondInput = createInput();

    await expect(service.detectProject(firstInput)).resolves.toEqual(
      await service.detectProject(secondInput)
    );
  });
});
