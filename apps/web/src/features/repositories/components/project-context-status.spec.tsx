import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { RepositoryStateSummary, RepositoryUpdateSummary } from "@ai-context/contracts";

import { ProjectContextStatus } from "./project-context-status";

const state: RepositoryStateSummary = {
  repositoryId: "repository_1",
  freshnessStatus: "FRESH",
  remoteHeadCommitSha: "abcdef1234567890",
  remoteHeadCheckedAt: "2026-09-29T10:00:00.000Z",
  lastScannedCommitSha: "abcdef1234567890",
  lastAnalyzedCommitSha: "abcdef1234567890",
  currentProjectContextId: "context_1",
  currentContextCommitSha: "abcdef1234567890",
  lastUpdateStatus: "COMPLETED"
};

const runningUpdate: RepositoryUpdateSummary = {
  id: "update_1",
  repositoryId: "repository_1",
  triggerType: "WEBHOOK",
  status: "RUNNING",
  baseCommitSha: "abcdef1234567890",
  targetCommitSha: "bcdef12345678901",
  startedAt: "2026-09-29T10:01:00.000Z",
  completedAt: null,
  failedAt: null,
  failureReason: null,
  scanId: null,
  analysisId: null,
  projectContextId: null,
  createdAt: "2026-09-29T10:01:00.000Z",
  updatedAt: "2026-09-29T10:01:00.000Z"
};

function renderStatus({
  currentUpdate = null,
  repositoryState = state
}: {
  currentUpdate?: RepositoryUpdateSummary | null;
  repositoryState?: RepositoryStateSummary | null;
} = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ProjectContextStatus
        contextGeneratedAt="2026-09-29T09:55:00.000Z"
        currentUpdate={currentUpdate}
        isLoading={false}
        projectStateHref="/repositories/repository_1#project-state"
        state={repositoryState}
        updatesHref="/repositories/repository_1#updates"
      />
    </MemoryRouter>
  );
}

describe("ProjectContextStatus", () => {
  it("renders authoritative Fresh without stale or failure copy", () => {
    const markup = renderStatus();

    expect(markup).toContain(">Fresh<");
    expect(markup).toContain("matches the latest verified GitHub commit");
    expect(markup).not.toContain("needs updating");
    expect(markup).not.toContain("Update failed");
  });

  it("renders stale copy and the existing update action", () => {
    const markup = renderStatus({
      repositoryState: { ...state, freshnessStatus: "STALE" }
    });

    expect(markup).toContain("Context needs updating");
    expect(markup).toContain("Update Context");
    expect(markup).not.toContain(">Fresh<");
  });

  it("keeps unknown state uncertain and offers the existing recheck action", () => {
    const markup = renderStatus({
      repositoryState: { ...state, freshnessStatus: "UNKNOWN" }
    });

    expect(markup).toContain("Freshness unavailable");
    expect(markup).toContain("Recheck freshness");
    expect(markup).not.toContain(">Fresh<");
  });

  it("prioritizes a running update without inventing progress", () => {
    const markup = renderStatus({
      currentUpdate: runningUpdate,
      repositoryState: { ...state, freshnessStatus: "UPDATE_FAILED" }
    });

    expect(markup).toContain("Updating Project Context");
    expect(markup).toContain("This may take a few moments");
    expect(markup).not.toContain("Update failed");
    expect(markup).not.toContain("%");
  });

  it("shows failure while preserving the previous valid context without raw errors", () => {
    const markup = renderStatus({
      currentUpdate: {
        ...runningUpdate,
        status: "FAILED",
        failureReason: "GITHUB_PROVIDER_TOKEN secret-internal-detail"
      }
    });

    expect(markup).toContain("Update failed");
    expect(markup).toContain("previous Project Context is still available");
    expect(markup).toContain("View updates");
    expect(markup).not.toContain("GITHUB_PROVIDER_TOKEN");
    expect(markup).not.toContain("secret-internal-detail");
    expect(markup).not.toContain(">Fresh<");
  });
});
