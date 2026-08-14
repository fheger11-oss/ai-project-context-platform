import type { AnalysisStatus } from "./analysis-status.js";
import { assertValidAnalysisStatusTransition } from "./analysis-state-machine.js";

export type AnalysisSnapshot = {
  id: string;
  scanId: string;
  status: AnalysisStatus;
  analyzerVersion: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAnalysisInput = {
  id: string;
  scanId: string;
  analyzerVersion: string;
  status?: AnalysisStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Analysis {
  private constructor(private readonly snapshot: AnalysisSnapshot) {}

  static create(input: CreateAnalysisInput): Analysis {
    const now = new Date();

    return new Analysis({
      id: input.id,
      scanId: input.scanId,
      status: input.status ?? "PENDING",
      analyzerVersion: input.analyzerVersion,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now
    });
  }

  static fromSnapshot(snapshot: AnalysisSnapshot): Analysis {
    return new Analysis({ ...snapshot });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get scanId(): string {
    return this.snapshot.scanId;
  }

  get status(): AnalysisStatus {
    return this.snapshot.status;
  }

  get analyzerVersion(): string {
    return this.snapshot.analyzerVersion;
  }

  transitionTo(nextStatus: AnalysisStatus, at = new Date()): Analysis {
    assertValidAnalysisStatusTransition(this.snapshot.status, nextStatus);

    return new Analysis({
      ...this.snapshot,
      status: nextStatus,
      startedAt: nextStatus === "RUNNING" ? at : this.snapshot.startedAt,
      completedAt:
        nextStatus === "COMPLETED" || nextStatus === "FAILED" || nextStatus === "CANCELLED"
          ? at
          : this.snapshot.completedAt,
      updatedAt: at
    });
  }

  toSnapshot(): AnalysisSnapshot {
    return { ...this.snapshot };
  }
}
