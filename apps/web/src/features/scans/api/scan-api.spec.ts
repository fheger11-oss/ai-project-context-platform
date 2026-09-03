import { afterEach, describe, expect, it, vi } from "vitest";

import { getScanHistory, getScanLimits, ScanApiRequestError, startScan } from "./scan-api";

const scanSnapshot = {
  id: "scan_1",
  repositoryId: "repository_1",
  status: "COMPLETED",
  commitSha: "abc123",
  startedAt: "2026-08-10T10:00:00.000Z",
  completedAt: "2026-08-10T10:00:06.000Z",
  durationMs: 6000,
  totalFiles: 91,
  totalSize: "563302",
  usage: {
    filesProcessed: 91,
    totalBytesConsidered: "563302"
  },
  limit: {
    reached: false,
    reason: null
  },
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:06.000Z"
} as const;

function mockFetch(response: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("scan-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts a scan with the authenticated request mechanism", async () => {
    const fetchMock = mockFetch(scanSnapshot, { status: 201 });

    const result = await startScan("access_token", "repository_1", "main");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/v1/scans/start", {
      method: "POST",
      headers: {
        Authorization: "Bearer access_token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        repositoryId: "repository_1",
        reference: "main"
      })
    });
    expect(result).toEqual(scanSnapshot);
    expect(result.totalSize).toBe("563302");
  });

  it("omits the optional scan reference when none is provided", async () => {
    const fetchMock = mockFetch(scanSnapshot, { status: 201 });

    await startScan("access_token", "repository_1");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          repositoryId: "repository_1"
        })
      })
    );
  });

  it("propagates start scan API errors", async () => {
    mockFetch({ message: "Repository was not found" }, { status: 404 });

    await expect(startScan("access_token", "repository_2", "main")).rejects.toMatchObject({
      status: 404,
      message: "Repository was not found"
    });
  });

  it("preserves structured scan limit error details", async () => {
    const limitError = {
      statusCode: 422,
      message: "This repository exceeds the file limit for a single scan.",
      error: "Scan Limit Reached",
      code: "SCAN_LIMIT_REACHED",
      limit: {
        reached: true,
        reason: "FILE_COUNT_LIMIT"
      },
      usage: {
        filesProcessed: 5000,
        totalBytesConsidered: "12345"
      },
      limits: {
        maxFiles: 5000,
        maxIndividualFileSizeBytes: 1048576,
        maxTotalSizeBytes: 26214400
      }
    } as const;
    mockFetch(limitError, { status: 422 });

    await expect(startScan("access_token", "repository_2", "main")).rejects.toMatchObject({
      status: 422,
      details: limitError
    });
  });

  it("loads canonical scan limits without an independent frontend constant", async () => {
    const limits = {
      maxFiles: 5000,
      maxIndividualFileSizeBytes: 1048576,
      maxTotalSizeBytes: 26214400
    };
    const fetchMock = mockFetch(limits);

    await expect(getScanLimits()).resolves.toEqual(limits);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/v1/scans/limits", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
  });

  it("returns scan history with pagination metadata", async () => {
    const history = {
      items: [scanSnapshot],
      pagination: {
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2
      }
    };
    const fetchMock = mockFetch(history);

    const result = await getScanHistory("access_token", "repository_1", 2, 10);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/scans/repositories/repository_1/history?page=2&pageSize=10",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result).toEqual(history);
    expect(result.items[0]?.totalSize).toBe("563302");
  });

  it("supports default backend pagination by omitting query parameters", async () => {
    const fetchMock = mockFetch({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0
      }
    });

    await getScanHistory("access_token", "repository/with space");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/scans/repositories/repository%2Fwith%20space/history",
      expect.any(Object)
    );
  });

  it("propagates scan history API errors", async () => {
    mockFetch({ message: "Authentication required" }, { status: 401 });

    const historyRequest = getScanHistory("access_token", "repository_1", 1, 20);

    await expect(historyRequest).rejects.toBeInstanceOf(ScanApiRequestError);
    await expect(historyRequest).rejects.toMatchObject({
      status: 401,
      message: "Authentication required"
    });
  });
});
