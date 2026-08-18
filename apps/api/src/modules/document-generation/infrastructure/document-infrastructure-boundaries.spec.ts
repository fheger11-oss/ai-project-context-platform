import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const infrastructureDirectory = new URL(".", import.meta.url);

function readInfrastructureSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readInfrastructureSources(entryPath);
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

describe("Document generation infrastructure boundaries", () => {
  const source = readInfrastructureSources(infrastructureDirectory);

  it("keeps renderer infrastructure deterministic and provider-free", () => {
    expect(source).not.toMatch(/@nestjs\//);
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/\bhttp\b/i);
    expect(source).not.toMatch(/node:fs|node:path/);
    expect(source).not.toMatch(/Date\.now|new Date|Math\.random|crypto/i);
  });

  it("does not access upstream engines, persistence, credentials, LLMs, queues, or jobs", () => {
    expect(source).not.toMatch(/ScanFile|ScanContentReader|ScanRepository|Scan\b/);
    expect(source).not.toMatch(/AnalysisResult|AnalysisRepository|AnalysisContextReader/);
    expect(source).not.toMatch(/ProjectContextRepository|PersistProjectContextService/);
    expect(source).not.toMatch(/authorization|credential|accessToken|refreshToken|githubToken/i);
    expect(source).not.toMatch(/openai|anthropic|gemini|embedding|vector|prompt/i);
    expect(source).not.toMatch(/redis|queue|job/i);
  });
});
