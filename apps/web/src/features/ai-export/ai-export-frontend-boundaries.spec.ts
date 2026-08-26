import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const aiExportDirectory = new URL(".", import.meta.url);

function readAiExportSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readAiExportSources(entryPath);
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

describe("AI Export frontend boundaries", () => {
  const source = readAiExportSources(aiExportDirectory);

  it("does not generate, transform, or interpret ProjectContext locally", () => {
    expect(source).not.toMatch(/ProjectContext|ContextClaim|claim\.kind|claim\.confidence/);
    expect(source).not.toMatch(/generateMarkdown|generatePlainText|generateAiContext/);
    expect(source).not.toMatch(/sections\.map|project\.claims|technology\.claims/);
  });

  it("does not access persistence, repositories, GitHub, credentials, or provider APIs", () => {
    expect(source).not.toMatch(/@prisma|PrismaClient|database|localStorage|sessionStorage/i);
    expect(source).not.toMatch(/repositories|github|raw file|access token secret/i);
    expect(source).not.toMatch(/openai|anthropic|claude|chatgpt|cursor|copilot|gemini/i);
  });

  it("does not depend on Document Generation or serializer implementation details", () => {
    expect(source).not.toMatch(/document-generation|DocumentGeneration|MarkdownDocumentContent/);
    expect(source).not.toMatch(/CanonicalAiExport|Serializer|Projector/);
  });
});
