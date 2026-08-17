import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const applicationDirectory = new URL(".", import.meta.url);

function readSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readSources(entryPath);
      }

      if (!entry.name.endsWith(".ts") || entry.name.endsWith(".spec.ts")) {
        return [];
      }

      const entryPath =
        directory instanceof URL ? new URL(entry.name, directory) : join(directory, entry.name);

      return readFileSync(entryPath, "utf8");
    })
    .join("\n");
}

describe("Context application boundaries", () => {
  const source = readSources(applicationDirectory);

  it("does not import Prisma, GitHub, scan content, HTTP DTOs, frontend, or LLM providers", () => {
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(
      /RepositoryContentProvider|ScanRepository|ScanContentReader|ScanFile/
    );
    expect(source).not.toMatch(/controller|dto|swagger/i);
    expect(source).not.toMatch(/@ai-context\/web|from ["'][^"']*react|zustand|react-query/i);
    expect(source).not.toMatch(/openai|anthropic|gemini|embedding|vector|prompt/i);
  });

  it("does not maintain framework-to-package detection mappings", () => {
    expect(source).not.toMatch(/frameworkPackageNames/);
    expect(source).not.toMatch(/@nest(?:\$\{[^}]+\})?js\/core|react-dom/);
  });
});
