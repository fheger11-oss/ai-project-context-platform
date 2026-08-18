import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const presentationDirectory = new URL(".", import.meta.url);

function readPresentationSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readPresentationSources(entryPath);
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

describe("Document generation presentation boundaries", () => {
  const source = readPresentationSources(presentationDirectory);

  it("does not access Prisma, infrastructure repositories, Scan, Analysis, GitHub, or credentials", () => {
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/PrismaDocumentRepository|PrismaService|prisma\./);
    expect(source).not.toMatch(/ScanFile|ScanContentReader|ScanRepository|Scan\b/);
    expect(source).not.toMatch(/AnalysisResult|AnalysisRepository|AnalysisContextReader/);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/authorization|credential|accessToken|refreshToken|githubToken/i);
  });

  it("does not contain document generation, rendering, persistence, or context interpretation logic", () => {
    expect(source).not.toMatch(/ProjectContext\.create|toSnapshot|claims|evidence/);
    expect(source).not.toMatch(/MarkdownDocumentRenderer|ProjectOverviewDocumentGenerator/);
    expect(source).not.toMatch(/DocumentRepository|DOCUMENT_REPOSITORY|save\(/);
  });
});
