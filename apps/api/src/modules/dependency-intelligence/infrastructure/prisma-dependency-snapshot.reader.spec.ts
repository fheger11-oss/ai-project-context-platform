import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { InvalidDependencySnapshotInputError } from "../domain/errors/invalid-dependency-snapshot-input.error.js";
import { PrismaDependencySnapshotReader } from "./prisma-dependency-snapshot.reader.js";

describe("PrismaDependencySnapshotReader", () => {
  it("reads the current promoted context and normalizes valid declarations", async () => {
    const { reader, findFirst } = harness([
      dependency("package.json", "react", "^18.2.0", "DEPENDENCY")
    ]);

    await expect(reader.readCurrent("repository-a")).resolves.toEqual({
      repositoryId: "repository-a",
      projectContextId: "context-1",
      analysisId: "analysis-1",
      commitSha: "commit-1",
      analyzerVersion: "analysis-engine-1.0",
      contextVersion: "context-engine-1.0",
      declarations: [
        {
          manifestPath: "package.json",
          packageName: "react",
          declaredVersion: "^18.2.0",
          dependencyType: "DEPENDENCY"
        }
      ]
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { repositoryId: "repository-a" } })
    );
    expect(JSON.stringify(findFirst.mock.calls[0]?.[0])).not.toContain("scanFile");
  });

  it("preserves multiple manifests and scoped package identity", async () => {
    const { reader } = harness([
      dependency("apps/web/package.json", "@tanstack/react-query", "^5.0.0", "DEPENDENCY"),
      dependency("package.json", "@tanstack/react-query", "workspace:*", "DEV_DEPENDENCY")
    ]);

    const result = await reader.readCurrent("repository-a");
    expect(result?.declarations).toEqual([
      {
        manifestPath: "apps/web/package.json",
        packageName: "@tanstack/react-query",
        declaredVersion: "^5.0.0",
        dependencyType: "DEPENDENCY"
      },
      {
        manifestPath: "package.json",
        packageName: "@tanstack/react-query",
        declaredVersion: "workspace:*",
        dependencyType: "DEV_DEPENDENCY"
      }
    ]);
  });

  it("preserves opaque version specifications and every existing dependency type", async () => {
    const { reader } = harness([
      dependency("a/package.json", "a", "^18.2.0", "DEPENDENCY"),
      dependency("b/package.json", "b", "workspace:*", "DEV_DEPENDENCY"),
      dependency("c/package.json", "c", "file:../shared", "PEER_DEPENDENCY"),
      dependency("d/package.json", "d", "git+https://example.test/d.git", "OPTIONAL_DEPENDENCY")
    ]);

    const result = await reader.readCurrent("repository-a");
    expect(
      result?.declarations.map(({ declaredVersion, dependencyType }) => ({
        declaredVersion,
        dependencyType
      }))
    ).toEqual([
      { declaredVersion: "^18.2.0", dependencyType: "DEPENDENCY" },
      { declaredVersion: "workspace:*", dependencyType: "DEV_DEPENDENCY" },
      { declaredVersion: "file:../shared", dependencyType: "PEER_DEPENDENCY" },
      {
        declaredVersion: "git+https://example.test/d.git",
        dependencyType: "OPTIONAL_DEPENDENCY"
      }
    ]);
  });

  it("orders declarations deterministically regardless of persisted array order", async () => {
    const declarations = [
      dependency("z/package.json", "z", "2", "DEPENDENCY"),
      dependency("a/package.json", "b", "1", "DEV_DEPENDENCY"),
      dependency("a/package.json", "a", "3", "DEPENDENCY")
    ];
    const forward = await harness(declarations).reader.readCurrent("repository-a");
    const reverse = await harness([...declarations].reverse()).reader.readCurrent("repository-a");

    expect(forward?.declarations).toEqual(reverse?.declarations);
    expect(forward?.declarations.map((item) => item.packageName)).toEqual(["a", "b", "z"]);
  });

  it("accepts an empty dependency array as a valid empty snapshot", async () => {
    await expect(harness([]).reader.readCurrent("repository-a")).resolves.toMatchObject({
      declarations: []
    });
  });

  it.each([
    { label: "missing dependency array", project: {} },
    { label: "non-array dependency data", project: { dependencies: {} } },
    { label: "non-object declaration", project: { dependencies: ["react"] } },
    {
      label: "missing package name",
      project: {
        dependencies: [{ manifestPath: "package.json", version: "1", type: "DEPENDENCY" }]
      }
    },
    {
      label: "invalid dependency type",
      project: {
        dependencies: [
          { manifestPath: "package.json", name: "react", version: "1", type: "RUNTIME" }
        ]
      }
    }
  ])("rejects malformed nested data: $label", async ({ project }) => {
    const { reader } = harness(undefined, { project });
    await expect(reader.readCurrent("repository-a")).rejects.toBeInstanceOf(
      InvalidDependencySnapshotInputError
    );
  });

  it.each([
    { contextRepositoryId: "repository-b" },
    { analysisRepositoryId: "repository-b" },
    { analysisId: "analysis-b" },
    { analysisCommitSha: "commit-b" },
    { contextHistory: [] }
  ])("rejects mismatched promoted provenance %#", async (overrides) => {
    const { reader } = harness([], overrides);
    await expect(reader.readCurrent("repository-a")).rejects.toBeInstanceOf(
      InvalidDependencySnapshotInputError
    );
  });

  it("returns no snapshot when the repository has no current promoted context", async () => {
    const { reader } = harness([], { currentProjectContext: null });
    await expect(reader.readCurrent("repository-a")).resolves.toBeNull();
  });
});

function harness(
  dependencies: unknown[] | undefined,
  overrides: {
    project?: unknown;
    contextRepositoryId?: string;
    analysisRepositoryId?: string;
    analysisId?: string;
    analysisCommitSha?: string;
    contextHistory?: unknown[];
    currentProjectContext?: null;
  } = {}
) {
  const context =
    overrides.currentProjectContext === null
      ? null
      : {
          id: "context-1",
          repositoryId: overrides.contextRepositoryId ?? "repository-a",
          analysisId: "analysis-1",
          commitSha: "commit-1",
          contextVersion: "context-engine-1.0",
          repositoryContextHistory: overrides.contextHistory ?? [{ id: "history-1" }],
          analysis: {
            id: overrides.analysisId ?? "analysis-1",
            repositoryId: overrides.analysisRepositoryId ?? "repository-a",
            commitSha: overrides.analysisCommitSha ?? "commit-1",
            analyzerVersion: "analysis-engine-1.0",
            status: "COMPLETED" as const,
            project: overrides.project ?? { dependencies }
          }
        };
  const findFirst = vi.fn(async (_args: unknown) => ({ currentProjectContext: context }));
  return {
    findFirst,
    reader: new PrismaDependencySnapshotReader({
      repositoryState: { findFirst }
    } as unknown as PrismaService)
  };
}

function dependency(
  manifestPath: string,
  name: string,
  version: string,
  type: "DEPENDENCY" | "DEV_DEPENDENCY" | "PEER_DEPENDENCY" | "OPTIONAL_DEPENDENCY"
) {
  return { manifestPath, name, version, type };
}
