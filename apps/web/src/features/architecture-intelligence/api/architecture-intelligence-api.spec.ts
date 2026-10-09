import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getArchitectureIntelligence,
  getArchitectureIntelligenceHistory,
  reprocessArchitectureIntelligence
} from "./architecture-intelligence-api";

describe("architecture-intelligence-api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serializes repository-scoped pagination and finding filters", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ processing: null, intelligence: null }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);
    await getArchitectureIntelligence("token", "owner/repo 1", {
      page: 2,
      pageSize: 20,
      modulePage: 3,
      modulePageSize: 20,
      ruleId: "architecture.circular-dependency",
      confidence: "HIGH",
      lifecycle: "NEW"
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:3000/api/v1/repositories/owner%2Frepo%201/architecture-intelligence?page=2&pageSize=20&modulePage=3&modulePageSize=20&ruleId=architecture.circular-dependency&confidence=HIGH&lifecycle=NEW"
    );
  });

  it("uses the bounded history endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [], pagination: {} }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);
    await getArchitectureIntelligenceHistory("token", "repository_1", 2, 20);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:3000/api/v1/repositories/repository_1/architecture-intelligence/history?page=2&pageSize=20"
    );
  });

  it("uses the explicit authenticated reprocessing endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await reprocessArchitectureIntelligence("token", "owner/repo 1");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:3000/api/v1/repositories/owner%2Frepo%201/updates/reprocess"
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
  });
});
