import { describe, expect, it } from "vitest";

import type { ScanContentFile } from "../contracts/scan-content-reader.contract.js";
import { EcosystemDetector } from "./ecosystem-detector.js";
import { FrameworkDetector } from "./framework-detector.js";
import { ExtensionLanguageDetector } from "./language-detector.js";
import { ManifestDetector } from "./manifest-detector.js";
import { PackageJsonParser } from "./package-json-parser.js";
import { PackageManagerDetector } from "./package-manager-detector.js";

function file(path: string, extension?: string | null): ScanContentFile {
  const filename = path.split("/").at(-1) ?? path;
  const dotIndex = filename.lastIndexOf(".");

  return {
    path,
    extension:
      extension !== undefined
        ? extension
        : dotIndex > 0 && dotIndex < filename.length - 1
          ? filename.slice(dotIndex + 1)
          : null,
    size: 1n,
    sha: `${path}_sha`,
    isBinary: false,
    isHidden: false
  };
}

describe("Project detection domain detectors", () => {
  it("detects supported languages from extensions", () => {
    const detector = new ExtensionLanguageDetector();

    expect(
      detector.detect([
        file("src/main.ts"),
        file("src/app.tsx"),
        file("src/index.js"),
        file("src/component.jsx"),
        file("package.json"),
        file("src/styles.css"),
        file("public/index.html"),
        file("README.md")
      ])
    ).toEqual([
      { language: "TYPESCRIPT", fileCount: 2 },
      { language: "JAVASCRIPT", fileCount: 2 },
      { language: "JSON", fileCount: 1 },
      { language: "CSS", fileCount: 1 },
      { language: "HTML", fileCount: 1 },
      { language: "MARKDOWN", fileCount: 1 }
    ]);
  });

  it("detects supported manifests and marks root package.json as primary", () => {
    const detector = new ManifestDetector();

    expect(
      detector.detect([
        file("apps/api/package.json"),
        file("package.json"),
        file("pnpm-lock.yaml"),
        file("apps/web/tsconfig.json"),
        file("src/main.ts")
      ])
    ).toEqual([
      { path: "package.json", type: "PACKAGE_JSON", isPrimary: true },
      { path: "pnpm-lock.yaml", type: "PNPM_LOCK", isPrimary: false },
      { path: "apps/api/package.json", type: "PACKAGE_JSON", isPrimary: false },
      { path: "apps/web/tsconfig.json", type: "TSCONFIG", isPrimary: false }
    ]);
  });

  it("does not promote nested package.json files when a root manifest is absent", () => {
    const detector = new ManifestDetector();

    expect(detector.detect([file("apps/web/package.json"), file("apps/api/package.json")])).toEqual(
      [
        { path: "apps/api/package.json", type: "PACKAGE_JSON", isPrimary: false },
        { path: "apps/web/package.json", type: "PACKAGE_JSON", isPrimary: false }
      ]
    );
  });

  it("detects package managers and reports lockfile conflicts", () => {
    const manifests = new ManifestDetector().detect([
      file("pnpm-lock.yaml"),
      file("package-lock.json"),
      file("yarn.lock")
    ]);
    const detector = new PackageManagerDetector();

    expect(
      detector.detect(
        [file("pnpm-lock.yaml")].flatMap((item) => new ManifestDetector().detect([item]))
      )
    ).toEqual({
      status: "DETECTED",
      packageManager: "PNPM",
      evidence: ["pnpm-lock.yaml"]
    });
    expect(detector.detect(manifests)).toEqual({
      status: "CONFLICT",
      candidates: [
        { packageManager: "NPM", evidence: ["package-lock.json"] },
        { packageManager: "PNPM", evidence: ["pnpm-lock.yaml"] },
        { packageManager: "YARN", evidence: ["yarn.lock"] }
      ]
    });
  });

  it("parses package.json metadata and dependency sections", () => {
    const parser = new PackageJsonParser();

    expect(
      parser.parse({
        path: "package.json",
        isPrimary: true,
        content: JSON.stringify({
          name: "project",
          version: "1.2.3",
          scripts: {
            test: "vitest",
            build: "vite build",
            dev: "vite",
            ignored: 123
          },
          dependencies: {
            react: "^19.0.0"
          },
          devDependencies: {
            typescript: "^5.0.0",
            vitest: "^4.0.0"
          },
          peerDependencies: {
            "@nestjs/core": "^11.0.0"
          },
          optionalDependencies: {
            sharp: "^0.33.0"
          }
        })
      })
    ).toEqual({
      status: "PARSED",
      packageJson: {
        path: "package.json",
        isPrimary: true,
        name: "project",
        version: "1.2.3",
        scripts: [
          {
            manifestPath: "package.json",
            name: "build",
            command: "vite build"
          },
          {
            manifestPath: "package.json",
            name: "dev",
            command: "vite"
          },
          {
            manifestPath: "package.json",
            name: "test",
            command: "vitest"
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
            manifestPath: "package.json",
            name: "vitest",
            version: "^4.0.0",
            type: "DEV_DEPENDENCY"
          },
          {
            manifestPath: "package.json",
            name: "@nestjs/core",
            version: "^11.0.0",
            type: "PEER_DEPENDENCY"
          },
          {
            manifestPath: "package.json",
            name: "sharp",
            version: "^0.33.0",
            type: "OPTIONAL_DEPENDENCY"
          }
        ],
        publicSurfaceDeclarations: []
      }
    });
  });

  it("does not invent scripts when package.json has no scripts object", () => {
    const parser = new PackageJsonParser();

    expect(
      parser.parse({
        path: "package.json",
        isPrimary: true,
        content: JSON.stringify({
          name: "project",
          dependencies: {
            react: "^19.0.0"
          }
        })
      })
    ).toEqual({
      status: "PARSED",
      packageJson: {
        path: "package.json",
        isPrimary: true,
        name: "project",
        version: null,
        dependencies: [
          {
            manifestPath: "package.json",
            name: "react",
            version: "^19.0.0",
            type: "DEPENDENCY"
          }
        ],
        publicSurfaceDeclarations: []
      }
    });
  });

  it("preserves package public-surface declarations without resolving their targets", () => {
    const parser = new PackageJsonParser();
    const parsed = parser.parse({
      path: "packages/example/package.json",
      isPrimary: false,
      content: JSON.stringify({
        main: "dist/index.js",
        module: "dist/index.mjs",
        types: "dist/index.d.ts",
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            default: "./dist/index.js"
          },
          "./feature/*": ["./dist/feature/*.js", "./fallback/*.js"],
          "./internal": null
        }
      })
    });

    expect(parsed).toMatchObject({ status: "PARSED" });
    if (parsed.status !== "PARSED") throw new Error("Expected parsed package.json");
    expect(parsed.packageJson.publicSurfaceDeclarations).toEqual([
      {
        manifestPath: "packages/example/package.json",
        sourceField: "EXPORTS",
        subpath: ".",
        selectorPath: [{ kind: "CONDITION", value: "default" }],
        disposition: "TARGET",
        declaredTarget: "./dist/index.js"
      },
      {
        manifestPath: "packages/example/package.json",
        sourceField: "EXPORTS",
        subpath: ".",
        selectorPath: [{ kind: "CONDITION", value: "types" }],
        disposition: "TARGET",
        declaredTarget: "./dist/index.d.ts"
      },
      {
        manifestPath: "packages/example/package.json",
        sourceField: "EXPORTS",
        subpath: "./feature/*",
        selectorPath: [{ kind: "FALLBACK", index: 0 }],
        disposition: "TARGET",
        declaredTarget: "./dist/feature/*.js"
      },
      {
        manifestPath: "packages/example/package.json",
        sourceField: "EXPORTS",
        subpath: "./feature/*",
        selectorPath: [{ kind: "FALLBACK", index: 1 }],
        disposition: "TARGET",
        declaredTarget: "./fallback/*.js"
      },
      {
        manifestPath: "packages/example/package.json",
        sourceField: "EXPORTS",
        subpath: "./internal",
        selectorPath: [],
        disposition: "BLOCKED",
        declaredTarget: null
      },
      {
        manifestPath: "packages/example/package.json",
        sourceField: "MAIN",
        subpath: ".",
        selectorPath: [],
        disposition: "TARGET",
        declaredTarget: "dist/index.js"
      },
      {
        manifestPath: "packages/example/package.json",
        sourceField: "MODULE",
        subpath: ".",
        selectorPath: [],
        disposition: "TARGET",
        declaredTarget: "dist/index.mjs"
      },
      {
        manifestPath: "packages/example/package.json",
        sourceField: "TYPES",
        subpath: ".",
        selectorPath: [],
        disposition: "TARGET",
        declaredTarget: "dist/index.d.ts"
      }
    ]);
  });

  it("preserves simple root exports and produces deterministic conditional ordering", () => {
    const parser = new PackageJsonParser();
    const parse = (exports: unknown) =>
      parser.parse({
        path: "package.json",
        isPrimary: true,
        content: JSON.stringify({ exports })
      });

    const simple = parse("./dist/index.js");
    expect(simple).toMatchObject({
      status: "PARSED",
      packageJson: {
        publicSurfaceDeclarations: [
          {
            sourceField: "EXPORTS",
            subpath: ".",
            selectorPath: [],
            disposition: "TARGET",
            declaredTarget: "./dist/index.js"
          }
        ]
      }
    });

    const first = parse({ ".": { types: "./index.d.ts", default: "./index.js" } });
    const second = parse({ ".": { default: "./index.js", types: "./index.d.ts" } });
    expect(first).toEqual(second);
  });

  it("handles malformed package.json deterministically", () => {
    const parser = new PackageJsonParser();

    expect(parser.parse({ path: "package.json", isPrimary: true, content: "{nope" })).toEqual({
      status: "MALFORMED",
      issue: {
        path: "package.json",
        code: "MALFORMED_PACKAGE_JSON"
      }
    });
  });

  it("detects React, NestJS, and Next.js from direct dependencies", () => {
    const detector = new FrameworkDetector();

    expect(
      detector.detect([
        {
          manifestPath: "package.json",
          name: "react",
          version: "^19.0.0",
          type: "DEPENDENCY"
        },
        {
          manifestPath: "apps/api/package.json",
          name: "@nestjs/core",
          version: "^11.0.0",
          type: "DEPENDENCY"
        },
        {
          manifestPath: "apps/web/package.json",
          name: "next",
          version: "^15.0.0",
          type: "DEPENDENCY"
        }
      ])
    ).toEqual([
      { framework: "NESTJS", evidence: ["apps/api/package.json:@nestjs/core"] },
      { framework: "NEXT_JS", evidence: ["apps/web/package.json:next"] },
      { framework: "REACT", evidence: ["package.json:react"] }
    ]);
  });

  it("detects Node.js, TypeScript, and JavaScript ecosystem indicators", () => {
    const detector = new EcosystemDetector();

    expect(
      detector.detect({
        languages: [
          { language: "TYPESCRIPT", fileCount: 3 },
          { language: "JAVASCRIPT", fileCount: 1 }
        ],
        manifests: [
          { path: "package.json", type: "PACKAGE_JSON", isPrimary: true },
          { path: "tsconfig.json", type: "TSCONFIG", isPrimary: true }
        ],
        packages: []
      })
    ).toEqual(["NODE_JS", "TYPESCRIPT", "JAVASCRIPT"]);
  });
});
