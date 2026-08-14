import { describe, expect, it } from "vitest";

import { Analysis } from "./analysis.js";
import type { AnalysisStatus } from "./analysis-status.js";
import { InvalidAnalysisStateTransitionError } from "./errors/invalid-analysis-state-transition.error.js";

const createdAt = new Date("2026-08-14T10:00:00.000Z");
const updatedAt = new Date("2026-08-14T10:00:01.000Z");

describe("Analysis domain model", () => {
  it("creates an analysis for a specific scan without infrastructure input", () => {
    const analysis = Analysis.create({
      id: "analysis_1",
      scanId: "scan_1",
      analyzerVersion: "analysis-foundation-1",
      createdAt,
      updatedAt
    });

    expect(analysis.toSnapshot()).toEqual({
      id: "analysis_1",
      scanId: "scan_1",
      status: "PENDING",
      analyzerVersion: "analysis-foundation-1",
      startedAt: null,
      completedAt: null,
      createdAt,
      updatedAt
    });
  });

  it("represents the analysis status vocabulary", () => {
    const statuses: AnalysisStatus[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];

    expect(statuses).toEqual(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]);
  });

  it("returns snapshots without exposing mutable internal state", () => {
    const analysis = Analysis.create({
      id: "analysis_1",
      scanId: "scan_1",
      analyzerVersion: "analysis-foundation-1",
      createdAt,
      updatedAt
    });
    const snapshot = analysis.toSnapshot();

    snapshot.status = "COMPLETED";

    expect(analysis.status).toBe("PENDING");
  });

  it("records lifecycle timestamps through analysis-owned transitions", () => {
    const startedAt = new Date("2026-08-14T10:01:00.000Z");
    const completedAt = new Date("2026-08-14T10:02:00.000Z");
    const analysis = Analysis.create({
      id: "analysis_1",
      scanId: "scan_1",
      analyzerVersion: "analysis-foundation-1",
      createdAt,
      updatedAt
    });

    const running = analysis.transitionTo("RUNNING", startedAt);
    const completed = running.transitionTo("COMPLETED", completedAt);

    expect(completed.toSnapshot()).toMatchObject({
      status: "COMPLETED",
      startedAt,
      completedAt,
      updatedAt: completedAt
    });
  });

  it("rejects invalid status transitions", () => {
    const analysis = Analysis.create({
      id: "analysis_1",
      scanId: "scan_1",
      analyzerVersion: "analysis-foundation-1",
      status: "COMPLETED",
      createdAt,
      updatedAt
    });

    expect(() => analysis.transitionTo("RUNNING")).toThrow(InvalidAnalysisStateTransitionError);
  });
});
