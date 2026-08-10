import "reflect-metadata";

import { RequestMethod } from "@nestjs/common";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import type { ScanService } from "../application/scan.service.js";
import type { ScanSnapshot } from "../domain/contracts/scan-repository.contract.js";
import { StartScanDto } from "./dto/start-scan.dto.js";
import { ScanController } from "./scan.controller.js";

const METHOD_METADATA = "method";
const PATH_METADATA = "path";
const VERSION_METADATA = "__version__";

function createSnapshot(overrides: Partial<ScanSnapshot> = {}): ScanSnapshot {
  return {
    id: "scan_1",
    repositoryId: "repository_1",
    status: "COMPLETED",
    commitSha: "commit_sha",
    startedAt: new Date("2026-08-07T10:00:00.000Z"),
    completedAt: new Date("2026-08-07T10:00:01.000Z"),
    durationMs: 1000,
    totalFiles: 2,
    totalSize: 42n,
    createdAt: new Date("2026-08-07T10:00:00.000Z"),
    updatedAt: new Date("2026-08-07T10:00:01.000Z"),
    ...overrides
  };
}

function createController(scanService?: Partial<ScanService>) {
  const snapshot = createSnapshot();
  const service = {
    startScan: vi.fn().mockResolvedValue(snapshot),
    ...scanService
  } as ScanService;

  return {
    controller: new ScanController(service),
    service,
    snapshot
  };
}

function containsBigInt(value: unknown): boolean {
  if (typeof value === "bigint") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsBigInt(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((item) => containsBigInt(item));
  }

  return false;
}

describe("ScanController", () => {
  it("exposes POST /scans/start", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ScanController)).toBe("scans");
    expect(Reflect.getMetadata(VERSION_METADATA, ScanController)).toBe("1");
    expect(Reflect.getMetadata(PATH_METADATA, ScanController.prototype.startScan)).toBe("start");
    expect(Reflect.getMetadata(METHOD_METADATA, ScanController.prototype.startScan)).toBe(
      RequestMethod.POST
    );
  });

  it("calls ScanService with a valid request", async () => {
    const { controller, service } = createController();

    await controller.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(service.startScan).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      reference: "main"
    });
  });

  it("maps totalSize to a string in the HTTP response", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n });
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    const response = await controller.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(response.totalSize).toBe("1500");
  });

  it("returns no JavaScript bigint values in the HTTP response", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n });
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    const response = await controller.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(containsBigInt(response)).toBe(false);
  });

  it("preserves existing response fields while mapping totalSize", async () => {
    const { controller, snapshot } = createController();

    const response = await controller.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(response).toEqual({
      ...snapshot,
      totalSize: snapshot.totalSize.toString()
    });
  });

  it("does not mutate the original ScanSnapshot", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n });
    const originalSnapshot = { ...snapshot };
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    await controller.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(snapshot).toEqual(originalSnapshot);
    expect(snapshot.totalSize).toBe(1500n);
  });

  it("returns a response that can be serialized as JSON", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n });
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    const response = await controller.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(() => JSON.stringify(response)).not.toThrow(
      new TypeError("Do not know how to serialize a BigInt")
    );
  });

  it("accepts a valid DTO", async () => {
    const dto = new StartScanDto();
    dto.repositoryId = "repository_1";
    dto.reference = "main";

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects an invalid DTO", async () => {
    const dto = new StartScanDto();
    dto.repositoryId = "";

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
