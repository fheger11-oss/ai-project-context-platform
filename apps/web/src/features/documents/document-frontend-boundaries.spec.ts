import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const documentsDirectory = new URL(".", import.meta.url);

function readDocumentSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readDocumentSources(entryPath);
      }

      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }

      if (entry.name.endsWith(".spec.ts") || entry.name.endsWith(".spec.tsx")) {
        return [];
      }

      const entryPath =
        directory instanceof URL ? new URL(entry.name, directory) : join(directory, entry.name);

      return readFileSync(entryPath, "utf8");
    })
    .join("\n");
}

describe("Document generation frontend boundaries", () => {
  const source = readDocumentSources(documentsDirectory);

  it("does not import backend persistence, generation, upstream engines, credentials, or external providers", () => {
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma|PrismaClient|PrismaService/i);
    expect(source).not.toMatch(/DocumentRepository|PrismaDocumentRepository|DocumentGenerator/);
    expect(source).not.toMatch(/ScanRepository|AnalysisRepository|RepositoryContentProvider/);
    expect(source).not.toMatch(/credential|accessToken.*secret|githubToken/i);
    expect(source).not.toMatch(/openai|anthropic|gemini|embedding|vector|prompt/i);
    expect(source).not.toMatch(/redis|queue|job/i);
  });

  it("does not interpret ProjectContext claims or generate Markdown locally", () => {
    expect(source).not.toMatch(/ProjectContext|ContextClaim|claims|evidence/);
    expect(source).not.toMatch(/## Technology|## Architecture|Observed:|Inferred:/);
  });
});
