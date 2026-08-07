import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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

describe("Scan domain boundaries", () => {
  const source = readDomainSources(domainDirectory);

  it("does not import Prisma", () => {
    expect(source).not.toMatch(/prisma/i);
  });

  it("does not reference GitHub", () => {
    expect(source).not.toMatch(/github/i);
  });

  it("does not define provider literals", () => {
    expect(source).not.toMatch(/provider\s*:\s*["'][^"']+["']/i);
  });
});
