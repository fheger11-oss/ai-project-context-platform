import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const aiExportDirectory = new URL("../", import.meta.url);

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

describe("AI Export canonical projection boundaries", () => {
  const source = readSources(aiExportDirectory);

  it("does not import upstream engines, providers, persistence, HTTP, or filesystem APIs", () => {
    expect(source).not.toMatch(/from\s+["'][^"']*\/scan\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/analysis\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/document-generation\//);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/@nestjs\//);
    expect(source).not.toMatch(/\bexpress\b|\bfastify\b|\bhttp\b/i);
    expect(source).not.toMatch(/node:fs|node:path|readFile|writeFile/);
  });

  it("does not introduce provider-specific export concepts", () => {
    expect(source).not.toMatch(/openai|anthropic|claude|chatgpt|cursor|copilot|gemini/i);
    expect(source).not.toMatch(/providerId|promptFormat|modelName/i);
  });

  it("does not persist exports or introduce serializer implementations", () => {
    expect(source).not.toMatch(/ExportArtifact|AI_CONTEXT|MARKDOWN|TEXT/);
    expect(source).not.toMatch(/serializer|Content-Disposition|contentType/i);
    expect(source).not.toMatch(/save\(|Repository|Prisma/);
  });
});
