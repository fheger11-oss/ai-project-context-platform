import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/lib/api-error";
import {
  createProjectKnowledge,
  listProjectKnowledge,
  updateProjectKnowledge
} from "./project-knowledge-api";

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}
describe("project-knowledge-api", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses encoded repository scope and query parameters", async () => {
    const fetch = mockFetch({
      items: [],
      pagination: { page: 2, pageSize: 10, total: 0, hasNextPage: false }
    });
    await listProjectKnowledge("token", "owner/repo 1", {
      page: 2,
      pageSize: 10,
      status: "ARCHIVED"
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/repositories/owner%2Frepo%201/knowledge?page=2&pageSize=10&status=ARCHIVED",
      expect.objectContaining({ method: "GET" })
    );
  });
  it("sends create and scoped update bodies", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "k1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "k1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await createProjectKnowledge("token", "r1", { content: "Fact" });
    await updateProjectKnowledge("token", "r1", "k/1", { status: "ARCHIVED" });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/repositories/r1/knowledge"),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ content: "Fact" }) })
    );
    const createBody = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(createBody).toEqual({ content: "Fact" });
    expect(createBody).not.toHaveProperty("knowledgeId");
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/repositories/r1/knowledge/k%2F1"),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "ARCHIVED" }) })
    );
  });
  it("preserves shared API errors", async () => {
    mockFetch({ message: "Forbidden" }, 403);
    await expect(
      listProjectKnowledge("token", "r1", { page: 1, pageSize: 10 })
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
