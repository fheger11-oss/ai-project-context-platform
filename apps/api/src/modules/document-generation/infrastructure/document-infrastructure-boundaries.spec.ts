import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const infrastructureDirectory = new URL(".", import.meta.url);

function readInfrastructureSources(
  directory: URL | string,
  options: { excludeFiles?: readonly string[] } = {}
): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readInfrastructureSources(entryPath, options);
      }

      if (
        !entry.name.endsWith(".ts") ||
        entry.name.endsWith(".spec.ts") ||
        options.excludeFiles?.includes(entry.name)
      ) {
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
  const nonPersistenceSource = readInfrastructureSources(infrastructureDirectory, {
    excludeFiles: ["prisma-document.repository.ts"]
  });

  it("keeps non-persistence infrastructure deterministic and provider-free", () => {
    expect(nonPersistenceSource).not.toMatch(/@nestjs\//);
    expect(nonPersistenceSource).not.toMatch(/@prisma\//i);
    expect(nonPersistenceSource).not.toMatch(/generated\/prisma/i);
    expect(nonPersistenceSource).not.toMatch(/github/i);
    expect(nonPersistenceSource).not.toMatch(/\bhttp\b/i);
    expect(nonPersistenceSource).not.toMatch(/node:fs|node:path/);
    expect(nonPersistenceSource).not.toMatch(/Date\.now|new Date|Math\.random|crypto/i);
  });

  it("does not access upstream engines, persistence, credentials, LLMs, queues, or jobs", () => {
    expect(source).not.toMatch(/ScanFile|ScanContentReader|ScanRepository|Scan\b/);
    expect(source).not.toMatch(/AnalysisResult|AnalysisRepository|AnalysisContextReader/);
    expect(source).not.toMatch(/ProjectContextRepository|PersistProjectContextService/);
    expect(source).not.toMatch(/authorization|credential|accessToken|refreshToken|githubToken/i);
    expect(source).not.toMatch(/openai|anthropic|gemini|embedding|vector|prompt/i);
    expect(source).not.toMatch(/redis|queue|job/i);
  });

  it("limits Prisma usage to the generated document persistence adapter", () => {
    expect(source).toMatch(/class PrismaDocumentRepository/);
    expect(nonPersistenceSource).not.toMatch(/PrismaService|generated\/prisma|@prisma\//i);
  });
});
