import { describe, expect, expectTypeOf, it } from "vitest";

import type { DashboardProjectsResponse, DashboardProjectSummary } from "./dashboard.js";

describe("Dashboard contracts", () => {
  it("models dashboard project summaries without Prisma internals or invented metrics", () => {
    expectTypeOf<DashboardProjectSummary>().toHaveProperty("repository");
    expectTypeOf<DashboardProjectSummary>().toHaveProperty("latestScan");
    expectTypeOf<DashboardProjectSummary>().toHaveProperty("latestAnalysis");
    expectTypeOf<DashboardProjectSummary>().toHaveProperty("latestContext");
    expectTypeOf<DashboardProjectSummary>().toHaveProperty("documents");
    expectTypeOf<DashboardProjectSummary>().toHaveProperty("aiExport");
    expectTypeOf<DashboardProjectSummary>().not.toHaveProperty("healthScore");
    expectTypeOf<DashboardProjectSummary>().not.toHaveProperty("progressPercentage");
    expectTypeOf<DashboardProjectSummary>().not.toHaveProperty("activityFeed");
  });

  it("uses existing public repository visibility and scan status values", () => {
    const response = {
      projects: [
        {
          repository: {
            id: "repository_1",
            name: "project",
            fullName: "owner/project",
            owner: "owner",
            description: null,
            defaultBranch: "main",
            visibility: "PRIVATE",
            language: "TypeScript",
            isArchived: false,
            lastSyncedAt: "2026-08-26T10:00:00.000Z"
          },
          latestScan: {
            id: "scan_1",
            status: "COMPLETED",
            commitSha: "abc123",
            createdAt: "2026-08-26T10:00:00.000Z",
            updatedAt: "2026-08-26T10:01:00.000Z",
            completedAt: "2026-08-26T10:01:00.000Z",
            totalFiles: 42,
            totalSize: "2048"
          },
          latestAnalysis: null,
          latestContext: null,
          documents: {
            available: false,
            count: 0
          },
          aiExport: {
            available: false
          }
        }
      ]
    } satisfies DashboardProjectsResponse;

    expect(response.projects[0]?.repository.visibility).toBe("PRIVATE");
    expect(response.projects[0]?.latestScan?.status).toBe("COMPLETED");
  });
});
