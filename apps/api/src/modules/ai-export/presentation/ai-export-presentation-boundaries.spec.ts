import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const presentationDirectory = new URL("./", import.meta.url);

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

describe("AI Export presentation boundaries", () => {
  const source = readPresentationSources(presentationDirectory);

  it("does not access persistence, repository files, upstream engines, or providers", () => {
    expect(source).not.toMatch(/from\s+["'][^"']*\/scan\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/analysis\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/document-generation\//);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/node:fs|node:path|readFile|writeFile/);
  });

  it("does not depend on serializers, canonical projection, or provider SDK concepts", () => {
    expect(source).not.toMatch(/ProjectContextAiExportProjector|CanonicalAiExport/);
    expect(source).not.toMatch(/AiContextSerializer|MarkdownAiExportSerializer/);
    expect(source).not.toMatch(/PlainTextAiExportSerializer|ai-context\.serializer/);
    expect(source).not.toMatch(/openai|anthropic|claude|chatgpt|cursor|copilot|gemini/i);
  });
});
