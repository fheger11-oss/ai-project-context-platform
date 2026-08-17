import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const infrastructureDirectory = new URL(".", import.meta.url);

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

describe("Context infrastructure boundaries", () => {
  const source = readSources(infrastructureDirectory);

  it("does not bypass Analysis persistence through Prisma, Scan, GitHub, credentials, or source parsing", () => {
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/PrismaService/);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(
      /RepositoryContentProvider|ScanRepository|ScanContentReader|ScanFile/
    );
    expect(source).not.toMatch(/authorization|credential|accessToken|refreshToken|githubToken/i);
    expect(source).not.toMatch(/SourceParser|typescript|createSourceFile|AST/);
  });
});
