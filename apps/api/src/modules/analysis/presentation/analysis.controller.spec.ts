import "reflect-metadata";

import { RequestMethod } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import type { GetAnalysisResultService } from "../application/get-analysis-result.service.js";
import type { GetAnalysisHistoryService } from "../application/get-analysis-history.service.js";
import type { RunAnalysisService } from "../application/run-analysis.service.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { AnalysisController } from "./analysis.controller.js";
import { AnalysisParamsDto } from "./dto/analysis-params.dto.js";
import { ScanAnalysisHistoryParamsDto } from "./dto/scan-analysis-history-params.dto.js";
import { CreateAnalysisDto } from "./dto/create-analysis.dto.js";
import { ScanAnalysisHistoryController } from "./scan-analysis-history.controller.js";

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

const analysisResult: AnalysisResult = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-engine-4.10",
  generatedAt: new Date("2026-08-14T12:00:00.000Z"),
  project: {
    ecosystems: ["NODE_JS"],
    languages: [],
    packageManager: { status: "UNKNOWN", evidence: [] },
    frameworks: [],
    manifests: [],
    packages: [],
    dependencies: [],
    issues: []
  },
  files: [{ path: "src/main.ts", category: "SOURCE" }],
  sourceStructures: [],
  relationships: [],
  dependencies: [],
  issues: []
};

const analysisHistory = [
  {
    analysisId: "analysis_2",
    scanId: "scan_1",
    analyzerVersion: "analysis-engine-4.10",
    generatedAt: new Date("2026-08-14T12:05:00.000Z"),
    commitSha: "abc123"
  },
  {
    analysisId: "analysis_1",
    scanId: "scan_1",
    analyzerVersion: "analysis-engine-4.10",
    generatedAt: new Date("2026-08-14T12:00:00.000Z"),
    commitSha: "abc123"
  }
];

function createController() {
  const runAnalysisService = {
    run: vi.fn(async () => analysisResult)
  } as unknown as RunAnalysisService;
  const getAnalysisResultService = {
    get: vi.fn(async () => analysisResult)
  } as unknown as GetAnalysisResultService;

  return {
    controller: new AnalysisController(runAnalysisService, getAnalysisResultService),
    runAnalysisService,
    getAnalysisResultService
  };
}

function createHistoryController() {
  const getAnalysisHistoryService = {
    getByScan: vi.fn(async () => analysisHistory)
  } as unknown as GetAnalysisHistoryService;

  return {
    controller: new ScanAnalysisHistoryController(getAnalysisHistoryService),
    getAnalysisHistoryService
  };
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

describe("AnalysisController", () => {
  it("exposes POST /analyses and GET /analyses/:analysisId under API version 1", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AnalysisController)).toBe("analyses");
    expect(Reflect.getMetadata(VERSION_METADATA, AnalysisController)).toBe("1");
    expect(Reflect.getMetadata(PATH_METADATA, AnalysisController.prototype.create)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, AnalysisController.prototype.create)).toBe(
      RequestMethod.POST
    );
    expect(Reflect.getMetadata(PATH_METADATA, AnalysisController.prototype.getById)).toBe(
      ":analysisId"
    );
    expect(Reflect.getMetadata(METHOD_METADATA, AnalysisController.prototype.getById)).toBe(
      RequestMethod.GET
    );
  });

  it("exposes GET /scans/:scanId/analyses under API version 1", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ScanAnalysisHistoryController)).toBe(
      "scans/:scanId/analyses"
    );
    expect(Reflect.getMetadata(VERSION_METADATA, ScanAnalysisHistoryController)).toBe("1");
    expect(
      Reflect.getMetadata(PATH_METADATA, ScanAnalysisHistoryController.prototype.getByScan)
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ScanAnalysisHistoryController.prototype.getByScan)
    ).toBe(RequestMethod.GET);
  });

  it("uses the existing Auth guard mechanism and Swagger bearer auth", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AnalysisController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, AnalysisController) as Array<
      Record<string, string[]>
    >;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("uses the existing Auth guard mechanism for scan analysis history", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ScanAnalysisHistoryController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, ScanAnalysisHistoryController) as
      Array<Record<string, string[]>> | undefined;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("delegates create requests to RunAnalysisService without client-controlled metadata", async () => {
    const { controller, runAnalysisService } = createController();

    await controller.create(user, { scanId: "scan_1" });

    expect(runAnalysisService.run).toHaveBeenCalledWith({
      userId: "user_1",
      scanId: "scan_1"
    });
    expect(runAnalysisService.run).not.toHaveBeenCalledWith(
      expect.objectContaining({
        analyzerVersion: expect.anything(),
        generatedAt: expect.anything()
      })
    );
  });

  it("delegates get requests to GetAnalysisResultService", async () => {
    const { controller, getAnalysisResultService } = createController();

    await controller.getById(user, { analysisId: "analysis_1" });

    expect(getAnalysisResultService.get).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
  });

  it("delegates scan analysis history requests to GetAnalysisHistoryService", async () => {
    const { controller, getAnalysisHistoryService } = createHistoryController();

    await controller.getByScan(user, { scanId: "scan_1" });

    expect(getAnalysisHistoryService.getByScan).toHaveBeenCalledWith({
      userId: "user_1",
      scanId: "scan_1"
    });
  });

  it("maps AnalysisResult to a JSON-safe HTTP response", async () => {
    const { controller } = createController();

    const response = await controller.create(user, { scanId: "scan_1" });

    expect(response).toEqual({
      ...analysisResult,
      generatedAt: "2026-08-14T12:00:00.000Z"
    });
    expect(() => JSON.stringify(response)).not.toThrow();
  });

  it("maps Analysis history to lightweight JSON-safe metadata", async () => {
    const { controller } = createHistoryController();

    const response = await controller.getByScan(user, { scanId: "scan_1" });

    expect(response).toEqual({
      items: [
        {
          analysisId: "analysis_2",
          scanId: "scan_1",
          analyzerVersion: "analysis-engine-4.10",
          generatedAt: "2026-08-14T12:05:00.000Z",
          commitSha: "abc123"
        },
        {
          analysisId: "analysis_1",
          scanId: "scan_1",
          analyzerVersion: "analysis-engine-4.10",
          generatedAt: "2026-08-14T12:00:00.000Z",
          commitSha: "abc123"
        }
      ]
    });
    expect(JSON.stringify(response)).not.toMatch(
      /project|files|sourceStructures|relationships|dependencies|issues/
    );
  });

  it("does not expose credential-shaped values in responses", async () => {
    const { controller } = createController();
    const response = await controller.getById(user, { analysisId: "analysis_1" });

    expect(
      containsKey(response, [
        "accessToken",
        "refreshToken",
        "githubToken",
        "authorization",
        "credential"
      ])
    ).toBe(false);
  });

  it("validates create request DTO", async () => {
    await expect(validate(plainToInstance(CreateAnalysisDto, {}))).resolves.not.toEqual([]);
    await expect(
      validate(plainToInstance(CreateAnalysisDto, { scanId: "scan_1" }))
    ).resolves.toEqual([]);
    await expect(
      validate(plainToInstance(CreateAnalysisDto, { scanId: "", githubToken: "nope" }))
    ).resolves.not.toEqual([]);
  });

  it("validates analysis route params", async () => {
    await expect(validate(plainToInstance(AnalysisParamsDto, {}))).resolves.not.toEqual([]);
    await expect(
      validate(plainToInstance(AnalysisParamsDto, { analysisId: "analysis_1" }))
    ).resolves.toEqual([]);
  });

  it("validates scan analysis history route params", async () => {
    await expect(validate(plainToInstance(ScanAnalysisHistoryParamsDto, {}))).resolves.not.toEqual(
      []
    );
    await expect(
      validate(plainToInstance(ScanAnalysisHistoryParamsDto, { scanId: "scan_1" }))
    ).resolves.toEqual([]);
  });
});
