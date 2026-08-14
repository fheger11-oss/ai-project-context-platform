import { describe, expect, it } from "vitest";

import type { ScanContentFile } from "../contracts/scan-content-reader.contract.js";
import type { FileCategory } from "./file-category.js";
import { RuleBasedFileClassifier } from "./rule-based-file-classifier.js";

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
    isHidden: path.split("/").some((segment) => segment.startsWith(".") && segment.length > 1),
    ...overrides
  };
}

describe("RuleBasedFileClassifier", () => {
  const classifier = new RuleBasedFileClassifier();

  it.each<[string, FileCategory]>([
    ["src/main.ts", "SOURCE"],
    ["src/main.mts", "SOURCE"],
    ["src/main.cts", "SOURCE"],
    ["src/components/app.TSX", "SOURCE"],
    ["src/index.js", "SOURCE"],
    ["src/index.cjs", "SOURCE"],
    ["src/index.mjs", "SOURCE"],
    ["src/foo/foo.spec.ts", "TEST"],
    ["src/foo/foo.test.ts", "TEST"],
    ["tests/support/example.ts", "TEST"],
    ["src/__tests__/example.ts", "TEST"],
    ["README.md", "DOCUMENTATION"],
    ["docs/architecture.md", "DOCUMENTATION"],
    ["CHANGELOG.MD", "DOCUMENTATION"],
    ["pnpm-lock.yaml", "LOCKFILE"],
    ["package-lock.json", "LOCKFILE"],
    ["Cargo.lock", "LOCKFILE"],
    ["tsconfig.json", "CONFIG"],
    ["eslint.config.js", "CONFIG"],
    [".prettierrc.json", "CONFIG"],
    ["Dockerfile", "INFRASTRUCTURE"],
    ["docker-compose.yaml", "INFRASTRUCTURE"],
    ["terraform/main.tf", "INFRASTRUCTURE"],
    ["k8s/deployment.yaml", "INFRASTRUCTURE"],
    ["scripts/build.sh", "SCRIPT"],
    ["tools/release.bash", "SCRIPT"],
    ["logo.svg", "ASSET"],
    ["public/image.png", "ASSET"],
    ["assets/source.ts", "ASSET"],
    ["dist/main.js", "GENERATED"],
    ["src/generated/foo.ts", "GENERATED"],
    ["src/foo.generated.ts", "GENERATED"],
    ["some/random/file.xyz", "UNKNOWN"],
    ["Makefile", "UNKNOWN"]
  ])("classifies %s as %s", (path, category) => {
    expect(classifier.classify(file(path))).toEqual({
      path,
      category
    });
  });

  it("uses explicit precedence for overlapping source and test files", () => {
    expect(classifier.classify(file("src/example.test.ts")).category).toBe("TEST");
  });

  it("uses explicit precedence for generated files before tests and source", () => {
    expect(classifier.classify(file("dist/example.test.ts")).category).toBe("GENERATED");
    expect(classifier.classify(file("src/generated/example.test.ts")).category).toBe("GENERATED");
  });

  it("uses explicit precedence for lockfiles before configuration", () => {
    expect(classifier.classify(file("package-lock.json")).category).toBe("LOCKFILE");
  });

  it("is deterministic for identical metadata", () => {
    const input = file("src/main.ts", {
      extension: "TS",
      size: 100n,
      sha: "same_sha"
    });

    expect(Array.from({ length: 5 }, () => classifier.classify(input))).toEqual([
      { path: "src/main.ts", category: "SOURCE" },
      { path: "src/main.ts", category: "SOURCE" },
      { path: "src/main.ts", category: "SOURCE" },
      { path: "src/main.ts", category: "SOURCE" },
      { path: "src/main.ts", category: "SOURCE" }
    ]);
  });

  it("uses metadata without requiring file content", () => {
    expect(classifier.classify(file("src/main.ts", { size: 0n, sha: "metadata_only" }))).toEqual({
      path: "src/main.ts",
      category: "SOURCE"
    });
  });

  it("can classify binary metadata as an asset without extension help", () => {
    expect(classifier.classify(file("public/logo", { extension: null, isBinary: true }))).toEqual({
      path: "public/logo",
      category: "ASSET"
    });
  });
});
