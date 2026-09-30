import { describe, expect, it, vi } from "vitest";

import type { ProjectDecisionService } from "../application/project-decision.service.js";
import { ProjectDecisionController } from "./project-decision.controller.js";

const date = new Date("2026-09-30T10:00:00.000Z");
const record = {
  id: "decision0001",
  repositoryId: "repository01",
  title: "Database",
  decision: "Use managed Postgres.",
  rationale: "Reduce operational overhead.",
  affectedArea: "Infrastructure",
  status: "ACTIVE" as const,
  decidedAt: date,
  sourceProjectContextId: null,
  sourceRepositoryUpdateId: null,
  sourceCommitSha: null,
  createdAt: date,
  updatedAt: date
};
const user = { id: "user_1", email: "owner@example.com", role: "USER" as const, tenantId: null };

function harness() {
  const service = {
    create: vi.fn(async () => record),
    list: vi.fn(async () => ({
      items: [record],
      pagination: { page: 1, pageSize: 10, total: 1, hasNextPage: false }
    })),
    get: vi.fn(async () => record),
    update: vi.fn(async () => ({ ...record, status: "ARCHIVED" as const }))
  };
  return {
    controller: new ProjectDecisionController(service as unknown as ProjectDecisionService),
    service
  };
}

describe("ProjectDecisionController", () => {
  it("creates through the route repository rather than a body repository", async () => {
    const h = harness();
    await h.controller.create(
      user,
      { id: "repository01" },
      {
        title: record.title,
        decision: record.decision,
        rationale: record.rationale,
        affectedArea: record.affectedArea,
        decidedAt: date.toISOString()
      }
    );
    expect(h.service.create).toHaveBeenCalledWith("user_1", "repository01", expect.anything());
  });

  it("lists with pagination and status filtering", async () => {
    const h = harness();
    await h.controller.list(
      user,
      { id: "repository01" },
      { page: 2, pageSize: 5, status: "ACTIVE" }
    );
    expect(h.service.list).toHaveBeenCalledWith({
      userId: "user_1",
      repositoryId: "repository01",
      page: 2,
      pageSize: 5,
      status: "ACTIVE"
    });
  });

  it("gets and patches using both repository and decision IDs", async () => {
    const h = harness();
    const params = { id: "repository01", decisionId: "decision0001" };
    await h.controller.get(user, params);
    await h.controller.update(user, params, { status: "ARCHIVED" });
    expect(h.service.get).toHaveBeenCalledWith("user_1", "repository01", "decision0001");
    expect(h.service.update).toHaveBeenCalledWith("user_1", "repository01", "decision0001", {
      status: "ARCHIVED"
    });
  });
});
