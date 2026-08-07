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

const snapshot: ScanSnapshot = {
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
  updatedAt: new Date("2026-08-07T10:00:01.000Z")
};

function createController(scanService?: Partial<ScanService>) {
  const service = {
    startScan: vi.fn().mockResolvedValue(snapshot),
    ...scanService
  } as ScanService;

  return {
    controller: new ScanController(service),
    service
  };
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

  it("forwards the returned ScanSnapshot unchanged", async () => {
    const { controller } = createController();

    await expect(
      controller.startScan({
        repositoryId: "repository_1",
        reference: "main"
      })
    ).resolves.toBe(snapshot);
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
