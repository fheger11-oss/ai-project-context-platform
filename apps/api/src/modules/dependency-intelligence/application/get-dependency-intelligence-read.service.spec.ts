import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type {
  CurrentDependencyIntelligence,
  GetDependencyHistoryComparisonService
} from "./get-dependency-history-comparison.service.js";
import { GetDependencyIntelligenceReadService } from "./get-dependency-intelligence-read.service.js";

describe("GetDependencyIntelligenceReadService", () => {
  it("authorizes and maps current intelligence with bounded pagination", async () => {
    const { service, authorize } = harness(result());
    const response = await service.getCurrent(query({ pageSize: 1, findingPageSize: 1 }));
    expect(authorize).toHaveBeenCalledWith("user-a", "repository-a");
    expect(response).toMatchObject({
      available: true,
      compatibility: "COMPARABLE",
      provenance: {
        repositoryId: "repository-a",
        projectContextId: "context-current",
        dependencyProcessorVersion: "dependency-processor-1.0"
      },
      summary: { declarationCount: 2, distinctPackageCount: 1, divergenceFindingCount: 1 }
    });
    expect(response.declarations.pagination).toEqual({
      page: 1,
      pageSize: 1,
      total: 2,
      hasNextPage: true
    });
    expect(response.findings.items[0]).toMatchObject({
      ruleId: "dependency.declaration-divergence",
      lifecycle: "PERSISTING",
      packageName: "react"
    });
  });

  it("maps adjacent history provenance, lifecycle counts, and declaration changes", async () => {
    const { service } = harness(result());
    const response = await service.getHistory(query());
    expect(response.current?.projectContextId).toBe("context-current");
    expect(response.previous?.projectContextId).toBe("context-previous");
    expect(response.lifecycleCounts).toEqual({ new: 0, persisting: 1, resolved: 0, recurring: 0 });
    expect(response.changeCounts.versionChanged).toBe(1);
    expect(response.changes.items[0]).toMatchObject({
      type: "VERSION_CHANGED",
      packageName: "react",
      previousVersion: "^17",
      currentVersion: "^18"
    });
  });

  it("keeps resolved transitions in history without presenting them as current findings", async () => {
    const value = result();
    const finding = value.comparison.lifecycle[0]!.currentFinding!;
    value.comparison.lifecycle = [
      {
        lifecycle: "RESOLVED",
        fingerprint: finding.fingerprint,
        packageName: finding.packageName,
        previousFinding: finding
      }
    ];
    const { service } = harness(value);

    const current = await service.getCurrent(query());
    const history = await service.getHistory(query());

    expect(current.summary?.divergenceFindingCount).toBe(0);
    expect(current.findings.items).toEqual([]);
    expect(history.lifecycleCounts.resolved).toBe(1);
    expect(history.findings.items[0]?.lifecycle).toBe("RESOLVED");
  });

  it("represents a repository without a promoted snapshot as an available=false state", async () => {
    const { service } = harness(null);
    await expect(service.getCurrent(query())).resolves.toMatchObject({
      available: false,
      provenance: null,
      summary: null
    });
    await expect(service.getHistory(query())).resolves.toMatchObject({
      available: false,
      current: null,
      previous: null
    });
  });

  it("does not read intelligence when repository authorization fails", async () => {
    const execute = vi.fn();
    const authorize = vi.fn().mockRejectedValue(new NotFoundException());
    const service = new GetDependencyIntelligenceReadService(
      { execute } as unknown as GetDependencyHistoryComparisonService,
      { getScanAccessMetadataForUser: authorize } as unknown as RepositoriesService
    );
    await expect(service.getCurrent(query())).rejects.toBeInstanceOf(NotFoundException);
    expect(execute).not.toHaveBeenCalled();
  });
});

function harness(value: ReturnType<typeof result> | null) {
  const authorize = vi.fn().mockResolvedValue({});
  return {
    authorize,
    service: new GetDependencyIntelligenceReadService(
      {
        execute: vi.fn().mockResolvedValue(value)
      } as unknown as GetDependencyHistoryComparisonService,
      { getScanAccessMetadataForUser: authorize } as unknown as RepositoriesService
    )
  };
}

function query(
  overrides: Partial<Parameters<GetDependencyIntelligenceReadService["getCurrent"]>[0]> = {}
) {
  return {
    userId: "user-a",
    repositoryId: "repository-a",
    page: 1,
    pageSize: 20,
    findingPage: 1,
    findingPageSize: 20,
    ...overrides
  };
}

function result(): CurrentDependencyIntelligence {
  const current = snapshot("current", "^18");
  const previous = snapshot("previous", "^17");
  const finding = {
    ruleId: "dependency.declaration-divergence" as const,
    ruleVersion: "1.0" as const,
    fingerprint: "fingerprint-react",
    packageName: "react",
    projectContextId: current.projectContextId,
    analysisId: current.analysisId,
    commitSha: current.commitSha,
    evidence: current.declarations.map((item) => ({
      ...item,
      projectContextId: current.projectContextId,
      analysisId: current.analysisId,
      commitSha: current.commitSha
    }))
  };
  return {
    snapshot: current,
    previousSnapshot: previous,
    comparison: {
      status: "COMPARABLE" as const,
      lifecycle: [
        {
          lifecycle: "PERSISTING" as const,
          fingerprint: finding.fingerprint,
          packageName: finding.packageName,
          currentFinding: finding,
          previousFinding: { ...finding, projectContextId: previous.projectContextId }
        }
      ],
      declarationChanges: [
        {
          type: "VERSION_CHANGED" as const,
          manifestPath: "package.json",
          packageName: "react",
          previousVersion: "^17",
          currentVersion: "^18",
          previousDependencyType: "DEPENDENCY" as const,
          currentDependencyType: "DEPENDENCY" as const
        }
      ]
    }
  };
}

function snapshot(id: string, secondVersion: string) {
  return {
    repositoryId: "repository-a",
    projectContextId: `context-${id}`,
    analysisId: `analysis-${id}`,
    commitSha: `commit-${id}`,
    analyzerVersion: "analyzer-1",
    contextVersion: "context-1",
    declarations: [
      {
        packageName: "react",
        declaredVersion: "^18",
        dependencyType: "DEPENDENCY" as const,
        manifestPath: "apps/web/package.json"
      },
      {
        packageName: "react",
        declaredVersion: secondVersion,
        dependencyType: "DEPENDENCY" as const,
        manifestPath: "package.json"
      }
    ]
  };
}
