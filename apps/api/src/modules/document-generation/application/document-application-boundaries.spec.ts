import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const applicationDirectory = new URL(".", import.meta.url);

function readApplicationSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readApplicationSources(entryPath);
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

describe("Document generation application boundaries", () => {
  const source = readApplicationSources(applicationDirectory);

  it("does not import Prisma, NestJS, HTTP, GitHub, filesystem, or external providers", () => {
    expect(source).not.toMatch(/@nestjs\//);
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/\bhttp\b/i);
    expect(source).not.toMatch(/node:fs|node:path/);
  });

  it("does not access scan, analysis, repository providers, credentials, or transport values", () => {
    expect(source).not.toMatch(/ScanFile|ScanContentReader|ScanRepository|Scan\b/);
    expect(source).not.toMatch(/AnalysisResult|AnalysisRepository|AnalysisContextReader/);
    expect(source).not.toMatch(/RepositoryContentProvider|repositoryProvider|readFile/);
    expect(source).not.toMatch(/authorization|credential|accessToken|refreshToken|githubToken/i);
    expect(source).not.toMatch(/request|response|headers|dto|controller/i);
  });

  it("does not introduce LLM, queue, job, rendering, or document persistence infrastructure", () => {
    expect(source).not.toMatch(/openai|anthropic|gemini|embedding|vector|prompt/i);
    expect(source).not.toMatch(/redis|queue|job/i);
    expect(source).not.toMatch(/MarkdownRenderer|DocumentRepository|PrismaDocument/);
  });
});
