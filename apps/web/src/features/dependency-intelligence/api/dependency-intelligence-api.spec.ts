import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  getDependencyIntelligence,
  getDependencyIntelligenceHistory
} from "./dependency-intelligence-api";

vi.mock("@/lib/authenticated-fetch", () => ({ authenticatedFetch: vi.fn() }));

describe("dependency intelligence API", () => {
  beforeEach(() => {
    vi.mocked(authenticatedFetch).mockImplementation(
      async () => new Response(JSON.stringify({ available: false }), { status: 200 })
    );
  });

  it("uses repository-scoped current and history endpoints with bounded query state", async () => {
    const options = { page: 2, pageSize: 20, findingPage: 3, findingPageSize: 10 };
    await getDependencyIntelligence("token", "owner/repo", options);
    await getDependencyIntelligenceHistory("token", "owner/repo", options);
    expect(vi.mocked(authenticatedFetch).mock.calls[0]?.[0]).toBe(
      "/repositories/owner%2Frepo/dependency-intelligence?page=2&pageSize=20&findingPage=3&findingPageSize=10"
    );
    expect(vi.mocked(authenticatedFetch).mock.calls[1]?.[0]).toBe(
      "/repositories/owner%2Frepo/dependency-intelligence/history?page=2&pageSize=20&findingPage=3&findingPageSize=10"
    );
  });
});
