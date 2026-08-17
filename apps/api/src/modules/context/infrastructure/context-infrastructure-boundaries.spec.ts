import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const infrastructureDirectory = new URL(".", import.meta.url);

function readSources(
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

        return readSources(entryPath, options);
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

describe("Context infrastructure boundaries", () => {
  const nonPersistenceSource = readSources(infrastructureDirectory, {
    excludeFiles: ["prisma-project-context.repository.ts"]
  });
  const source = readSources(infrastructureDirectory);

  it("keeps non-persistence adapters from bypassing Analysis through Prisma or Scan access", () => {
    expect(nonPersistenceSource).not.toMatch(/@prisma\//i);
    expect(nonPersistenceSource).not.toMatch(/generated\/prisma/i);
    expect(nonPersistenceSource).not.toMatch(/PrismaService/);
    expect(nonPersistenceSource).not.toMatch(/github/i);
    expect(nonPersistenceSource).not.toMatch(
      /RepositoryContentProvider|ScanRepository|ScanContentReader|ScanFile/
    );
    expect(nonPersistenceSource).not.toMatch(
      /authorization|credential|accessToken|refreshToken|githubToken/i
    );
    expect(nonPersistenceSource).not.toMatch(/SourceParser|typescript|createSourceFile|AST/);
  });

  it("limits Prisma usage to the ProjectContext persistence adapter", () => {
    expect(source).toMatch(/class PrismaProjectContextRepository/);
    expect(source).not.toMatch(/RepositoryContentProvider|ScanContentReader|ScanFile/);
    expect(source).not.toMatch(/SourceParser|typescript|createSourceFile|AST/);
  });
});
