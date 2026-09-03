import "reflect-metadata";

import { RequestMethod, UnprocessableEntityException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import type { ScanService } from "../application/scan.service.js";
import type { ScanSnapshot } from "../domain/contracts/scan-repository.contract.js";
import { ScanLimitExceededError } from "../domain/errors/scan-limit-exceeded.error.js";
import { SCAN_LIMITS } from "../domain/scan-limits.js";
import {
  DEFAULT_SCAN_HISTORY_PAGE,
  DEFAULT_SCAN_HISTORY_PAGE_SIZE,
  MAX_SCAN_HISTORY_PAGE_SIZE,
  ScanHistoryQueryDto
} from "./dto/scan-history-query.dto.js";
import { StartScanDto } from "./dto/start-scan.dto.js";
import { ScanController } from "./scan.controller.js";

const METHOD_METADATA = "method";
const PATH_METADATA = "path";
const VERSION_METADATA = "__version__";
const GUARDS_METADATA = "__guards__";
const API_SECURITY_METADATA = "swagger/apiSecurity";
const user: AuthenticatedUser = {
  id: "user_1",
  email: "owner@example.com",
  role: "USER",
  tenantId: null
};

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
    filesProcessed: 2,
    totalBytesConsidered: 42n,
    scanLimitReason: null,
    createdAt: new Date("2026-08-07T10:00:00.000Z"),
    updatedAt: new Date("2026-08-07T10:00:01.000Z"),
    ...overrides
  };
}

function createController(scanService?: Partial<ScanService>) {
  const snapshot = createSnapshot();
  const scanHistoryAnalysisQueryService = {
    getLatestCompletedByScanId: vi.fn().mockResolvedValue(new Map())
  };
  const service = {
    startScan: vi.fn().mockResolvedValue(snapshot),
    getScanHistory: vi.fn().mockResolvedValue({
      items: [snapshot],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1
      }
    }),
    ...scanService
  } as ScanService;

  return {
    controller: new ScanController(service, scanHistoryAnalysisQueryService as never),
    scanHistoryAnalysisQueryService,
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

function containsKey(value: unknown, keys: readonly string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsKey(item, keys));
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(
      ([key, item]) => keys.includes(key) || containsKey(item, keys)
    );
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

  it("exposes GET /scans/repositories/:repositoryId/history", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, ScanController.prototype.getRepositoryScanHistory)
    ).toBe("repositories/:repositoryId/history");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ScanController.prototype.getRepositoryScanHistory)
    ).toBe(RequestMethod.GET);
  });

  it("exposes GET /scans/limits", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ScanController.prototype.getScanLimits)).toBe(
      "limits"
    );
    expect(Reflect.getMetadata(METHOD_METADATA, ScanController.prototype.getScanLimits)).toBe(
      RequestMethod.GET
    );
  });

  it("protects scan start by the existing Auth guard mechanism", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ScanController.prototype.startScan
    ) as unknown[];

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it("protects scan history by the existing Auth guard mechanism", () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ScanController.prototype.getRepositoryScanHistory
    ) as unknown[];

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it("marks scan start as Bearer-authenticated for Swagger", () => {
    const security = Reflect.getMetadata(
      API_SECURITY_METADATA,
      ScanController.prototype.startScan
    ) as Array<Record<string, string[]>>;

    expect(security).toContainEqual({ bearer: [] });
  });

  it("marks scan history as Bearer-authenticated for Swagger", () => {
    const security = Reflect.getMetadata(
      API_SECURITY_METADATA,
      ScanController.prototype.getRepositoryScanHistory
    ) as Array<Record<string, string[]>>;

    expect(security).toContainEqual({ bearer: [] });
  });

  it("calls ScanService with a valid request", async () => {
    const { controller, service } = createController();

    await controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(service.startScan).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      reference: "main",
      userId: "user_1"
    });
  });

  it("does not force repositories without an explicit scan reference onto main", async () => {
    const { controller, service } = createController();

    await controller.startScan(user, {
      repositoryId: "repository_1"
    });

    expect(service.startScan).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1"
    });
  });

  it("maps totalSize to a string in the HTTP response", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n, totalBytesConsidered: 1500n });
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    const response = await controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(response.totalSize).toBe("1500");
    expect(response.usage.totalBytesConsidered).toBe("1500");
  });

  it("returns no JavaScript bigint values in the HTTP response", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n, totalBytesConsidered: 1500n });
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    const response = await controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(containsBigInt(response)).toBe(false);
  });

  it("preserves existing response fields while adding usage and limit state", async () => {
    const { controller, snapshot } = createController();

    const response = await controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(response).toEqual({
      id: snapshot.id,
      repositoryId: snapshot.repositoryId,
      status: snapshot.status,
      commitSha: snapshot.commitSha,
      startedAt: snapshot.startedAt,
      completedAt: snapshot.completedAt,
      durationMs: snapshot.durationMs,
      totalFiles: snapshot.totalFiles,
      totalSize: snapshot.totalSize.toString(),
      usage: {
        filesProcessed: snapshot.filesProcessed,
        totalBytesConsidered: snapshot.totalBytesConsidered.toString()
      },
      limit: {
        reached: false,
        reason: null
      },
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt
    });
  });

  it("does not mutate the original ScanSnapshot", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n });
    const originalSnapshot = { ...snapshot };
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    await controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(snapshot).toEqual(originalSnapshot);
    expect(snapshot.totalSize).toBe(1500n);
  });

  it("returns a response that can be serialized as JSON", async () => {
    const snapshot = createSnapshot({ totalSize: 1500n, totalBytesConsidered: 1500n });
    const { controller } = createController({
      startScan: vi.fn().mockResolvedValue(snapshot)
    });

    const response = await controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(() => JSON.stringify(response)).not.toThrow(
      new TypeError("Do not know how to serialize a BigInt")
    );
  });

  it("returns canonical scan limits from the scan endpoint", () => {
    const { controller } = createController();

    expect(controller.getScanLimits()).toBe(SCAN_LIMITS);
  });

  it("maps scan limit failures to structured 422 responses", async () => {
    const limitError = new ScanLimitExceededError(
      "INDIVIDUAL_FILE_SIZE_LIMIT",
      {
        filesProcessed: 7,
        totalBytesConsidered: 1048577n
      },
      SCAN_LIMITS,
      "src/large.ts"
    );
    const { controller } = createController({
      startScan: vi.fn().mockRejectedValue(limitError)
    });

    const request = controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    await expect(request).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(request).rejects.toMatchObject({
      response: {
        statusCode: 422,
        code: "SCAN_LIMIT_REACHED",
        error: "Scan Limit Reached",
        limit: {
          reached: true,
          reason: "INDIVIDUAL_FILE_SIZE_LIMIT"
        },
        usage: {
          filesProcessed: 7,
          totalBytesConsidered: "1048577"
        },
        limits: SCAN_LIMITS,
        filePath: "src/large.ts"
      }
    });
  });

  it("does not expose credential-shaped values in the HTTP response", async () => {
    const { controller } = createController();

    const response = await controller.startScan(user, {
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(
      containsKey(response, [
        "accessToken",
        "refreshToken",
        "bearerToken",
        "authorization",
        "credential",
        "clientSecret",
        "oauthToken"
      ])
    ).toBe(false);
  });

  it("calls ScanService for repository history with authenticated user context", async () => {
    const { controller, service } = createController();

    await controller.getRepositoryScanHistory(user, "repository_1", {
      page: 2,
      pageSize: 10
    });

    expect(service.getScanHistory).toHaveBeenCalledWith({
      userId: "user_1",
      repositoryId: "repository_1",
      page: 2,
      pageSize: 10
    });
  });

  it("maps scan history totalSize values to JSON-safe strings", async () => {
    const snapshots = [
      createSnapshot({ id: "scan_2", totalSize: 1500n }),
      createSnapshot({ id: "scan_1", totalSize: 42n })
    ];
    const { controller } = createController({
      getScanHistory: vi.fn().mockResolvedValue({
        items: snapshots,
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 2,
          totalPages: 1
        }
      })
    });

    const response = await controller.getRepositoryScanHistory(user, "repository_1", {
      page: 1,
      pageSize: 20
    });

    expect(response.items.map((item) => item.totalSize)).toEqual(["1500", "42"]);
    expect(response.pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1
    });
    expect(containsBigInt(response)).toBe(false);
    expect(() => JSON.stringify(response)).not.toThrow(
      new TypeError("Do not know how to serialize a BigInt")
    );
  });

  it("includes latest completed analysis summaries without per-scan frontend reads", async () => {
    const snapshots = [
      createSnapshot({ id: "scan_2" }),
      createSnapshot({ id: "scan_1" }),
      createSnapshot({ id: "scan_failed", status: "FAILED" })
    ];
    const { controller, scanHistoryAnalysisQueryService } = createController({
      getScanHistory: vi.fn().mockResolvedValue({
        items: snapshots,
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 3,
          totalPages: 1
        }
      })
    });
    scanHistoryAnalysisQueryService.getLatestCompletedByScanId.mockResolvedValue(
      new Map([
        [
          "scan_1",
          {
            analysisId: "analysis_latest",
            scanId: "scan_1",
            analyzerVersion: "analysis-engine@1",
            generatedAt: "2026-08-14T12:05:00.000Z",
            commitSha: "commit_sha"
          }
        ]
      ])
    );

    const response = await controller.getRepositoryScanHistory(user, "repository_1", {
      page: 1,
      pageSize: 20
    });

    expect(scanHistoryAnalysisQueryService.getLatestCompletedByScanId).toHaveBeenCalledWith(
      snapshots
    );
    expect(response.items.map((item) => item.latestAnalysis)).toEqual([
      null,
      {
        analysisId: "analysis_latest",
        scanId: "scan_1",
        analyzerVersion: "analysis-engine@1",
        generatedAt: "2026-08-14T12:05:00.000Z",
        commitSha: "commit_sha"
      },
      null
    ]);
  });

  it("returns empty scan history with pagination metadata", async () => {
    const { controller } = createController({
      getScanHistory: vi.fn().mockResolvedValue({
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0
        }
      })
    });

    await expect(
      controller.getRepositoryScanHistory(user, "repository_1", {
        page: 1,
        pageSize: 20
      })
    ).resolves.toEqual({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0
      }
    });
  });

  it("does not expose credential-shaped values in the history response", async () => {
    const { controller } = createController();

    const response = await controller.getRepositoryScanHistory(user, "repository_1", {
      page: 1,
      pageSize: 20
    });

    expect(
      containsKey(response, [
        "accessToken",
        "refreshToken",
        "bearerToken",
        "authorization",
        "credential",
        "clientSecret",
        "oauthToken"
      ])
    ).toBe(false);
  });

  it("uses default scan history pagination values", async () => {
    const dto = plainToInstance(ScanHistoryQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(DEFAULT_SCAN_HISTORY_PAGE);
    expect(dto.pageSize).toBe(DEFAULT_SCAN_HISTORY_PAGE_SIZE);
  });

  it("accepts valid scan history pagination values", async () => {
    const dto = plainToInstance(ScanHistoryQueryDto, {
      page: "2",
      pageSize: "50"
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(50);
  });

  it("rejects invalid scan history pagination values", async () => {
    const dto = plainToInstance(ScanHistoryQueryDto, {
      page: "0",
      pageSize: "abc"
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("enforces the scan history pageSize maximum", async () => {
    const dto = plainToInstance(ScanHistoryQueryDto, {
      page: "1",
      pageSize: String(MAX_SCAN_HISTORY_PAGE_SIZE + 1)
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
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
