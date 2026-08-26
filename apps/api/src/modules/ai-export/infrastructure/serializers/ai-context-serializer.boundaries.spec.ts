import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const serializersDirectory = new URL(".", import.meta.url);

function readSerializerSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readSerializerSources(entryPath);
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

describe("AI_CONTEXT serializer boundaries", () => {
  const source = readSerializerSources(serializersDirectory);

  it("does not depend on ProjectContext or upstream engines", () => {
    expect(source).not.toMatch(/ProjectContext/);
    expect(source).not.toMatch(/from\s+["'][^"']*\/context\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/scan\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/analysis\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/document-generation\//);
  });

  it("does not depend on providers, persistence, HTTP, frontend, or filesystem APIs", () => {
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/@nestjs\//);
    expect(source).not.toMatch(/\bexpress\b|\bfastify\b|\bhttp\b/i);
    expect(source).not.toMatch(/apps\/web|browser|window|document\./i);
    expect(source).not.toMatch(/node:fs|node:path|readFile|writeFile/);
  });

  it("does not introduce provider-specific concepts or out-of-scope formats", () => {
    expect(source).not.toMatch(/openai|anthropic|claude|chatgpt|cursor|copilot|gemini/i);
    expect(source).not.toMatch(/\bMARKDOWN\b|\bTEXT\b/);
  });
});
