import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const domainDirectory = new URL(".", import.meta.url);

function readDomainSources(directory: URL | string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        const entryPath =
          directory instanceof URL
            ? new URL(`${entry.name}/`, directory)
            : join(directory, entry.name);

        return readDomainSources(entryPath);
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

describe("Context domain boundaries", () => {
  const source = readDomainSources(domainDirectory);

  it("does not import NestJS, Prisma, HTTP, GitHub, filesystem, or external providers", () => {
    expect(source).not.toMatch(/@nestjs\//);
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/\bhttp\b/i);
    expect(source).not.toMatch(/node:fs|node:path/);
  });

  it("does not expose credential-bearing fields in context contracts", () => {
    expect(source).not.toMatch(/authorization|credential|accessToken|refreshToken|githubToken/i);
  });

  it("does not depend on scan content or repository provider contracts", () => {
    expect(source).not.toMatch(/RepositoryContentProvider|ScanContentReader|ScanFile|readFile/);
  });

  it("does not introduce LLM or embedding concepts", () => {
    expect(source).not.toMatch(/openai|anthropic|gemini|embedding|vector|prompt/i);
  });
});
