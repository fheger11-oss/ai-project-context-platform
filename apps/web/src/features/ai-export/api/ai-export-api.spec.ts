import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiExportResponse } from "@ai-context/contracts";

import {
  AiExportApiRequestError,
  downloadAiExport,
  filenameFromContentDisposition,
  getAiExport
} from "./ai-export-api";

const exported: AiExportResponse = {
  projectContextId: "project_context_1",
  contextId: "context:analysis_1:context-engine@5.7.1",
  format: "AI_CONTEXT",
  exportVersion: "ai-export@1",
  contextVersion: "context-engine@5.7.1",
  contentType: "application/json; charset=utf-8",
  filename: "ai-context.json",
  content: '{\n  "type": "AI_PROJECT_CONTEXT"\n}\n'
};

function mockJsonFetch(response: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function mockDownloadFetch(content: string, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(content, init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("ai-export-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["AI_CONTEXT", "MARKDOWN", "TEXT"] as const)(
    "requests %s exports from the backend JSON contract",
    async (format) => {
      const fetchMock = mockJsonFetch({ ...exported, format });

      await expect(
        getAiExport("access_token", { contextId: "project context/1", format })
      ).resolves.toMatchObject({
        format
      });
      expect(fetchMock).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/contexts/project%20context%2F1/export?format=${format}&download=false`,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer access_token",
            "Content-Type": "application/json"
          })
        })
      );
    }
  );

  it("requests download mode and respects backend filename/content type headers", async () => {
    const fetchMock = mockDownloadFetch("AI PROJECT CONTEXT\n", {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="ai-context.txt"',
        "Content-Type": "text/plain; charset=utf-8"
      }
    });

    const response = await downloadAiExport("access_token", {
      contextId: "project_context_1",
      format: "TEXT"
    });

    await expect(response.content.text()).resolves.toBe("AI PROJECT CONTEXT\n");
    expect(response.filename).toBe("ai-context.txt");
    expect(response.contentType).toBe("text/plain; charset=utf-8");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/contexts/project_context_1/export?format=TEXT&download=true",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer access_token" })
      })
    );
  });

  it("parses common Content-Disposition filename forms", () => {
    expect(filenameFromContentDisposition('attachment; filename="ai-context.md"')).toBe(
      "ai-context.md"
    );
    expect(filenameFromContentDisposition("attachment; filename=ai-context.txt")).toBe(
      "ai-context.txt"
    );
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''ai-context.json")).toBe(
      "ai-context.json"
    );
  });

  it("returns safe API errors for failed JSON and download requests", async () => {
    mockJsonFetch({ message: "ProjectContext was not found" }, { status: 404 });

    await expect(
      getAiExport("access_token", { contextId: "missing", format: "AI_CONTEXT" })
    ).rejects.toMatchObject({
      status: 404,
      message: "ProjectContext was not found"
    });

    mockDownloadFetch(JSON.stringify({ message: "Context is not accessible" }), { status: 403 });

    await expect(
      downloadAiExport("access_token", { contextId: "project_context_1", format: "MARKDOWN" })
    ).rejects.toBeInstanceOf(AiExportApiRequestError);
  });

  it("fails download mode when the backend does not provide a filename", async () => {
    mockDownloadFetch("AI PROJECT CONTEXT\n", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });

    await expect(
      downloadAiExport("access_token", { contextId: "project_context_1", format: "TEXT" })
    ).rejects.toMatchObject({
      message: "AI export download did not include a filename"
    });
  });
});
