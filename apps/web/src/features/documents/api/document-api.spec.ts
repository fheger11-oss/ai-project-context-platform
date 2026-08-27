import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  DocumentHistoryResponse,
  GeneratedDocumentResponse,
  GenerateDocumentRequest
} from "@ai-context/contracts";

import {
  DocumentApiRequestError,
  generateDocument,
  getDocument,
  getDocumentHistory,
  regenerateDocument
} from "./document-api";

const document: GeneratedDocumentResponse = {
  id: "document_1",
  projectContextId: "project_context_1",
  contextId: "context:analysis_1:context-engine@1",
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content: "# Project Overview\n\n- Observed: exact artifact.\n",
  createdAt: "2026-08-18T10:00:00.000Z"
};
const history: DocumentHistoryResponse = {
  documents: [document]
};
const request: GenerateDocumentRequest = {
  contextId: "project_context_1",
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN"
};

function mockFetch(response: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("document-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates a document through the authenticated API", async () => {
    const fetchMock = mockFetch(document, { status: 201 });

    await expect(generateDocument("access_token", request)).resolves.toEqual(document);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/documents",
      expect.objectContaining({
        body: JSON.stringify(request),
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access_token" })
      })
    );
  });

  it("does not send generator version from the frontend", async () => {
    const fetchMock = mockFetch(document, { status: 201 });

    await generateDocument("access_token", request);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/documents",
      expect.objectContaining({
        body: expect.not.stringContaining("generatorVersion")
      })
    );
  });

  it("retrieves a generated document", async () => {
    const fetchMock = mockFetch(document);

    await expect(getDocument("access_token", "document/with space")).resolves.toEqual(document);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/documents/document%2Fwith%20space",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("retrieves document history for a ProjectContext", async () => {
    const fetchMock = mockFetch(history);

    await expect(getDocumentHistory("access_token", "project context/1")).resolves.toEqual(history);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/documents?contextId=project%20context%2F1",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("regenerates a document through the authenticated API", async () => {
    const fetchMock = mockFetch({ ...document, id: "document_2" }, { status: 201 });

    await expect(regenerateDocument("access_token", "document_1")).resolves.toMatchObject({
      id: "document_2"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/documents/document_1/regenerate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns safe Document API errors", async () => {
    mockFetch({ message: "Document was not found" }, { status: 404 });

    const requestPromise = getDocument("access_token", "missing");

    await expect(requestPromise).rejects.toBeInstanceOf(DocumentApiRequestError);
    await expect(requestPromise).rejects.toMatchObject({
      status: 404,
      message: "Document was not found"
    });
  });
});
