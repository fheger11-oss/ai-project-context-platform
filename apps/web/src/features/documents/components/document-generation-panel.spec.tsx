import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentHistoryResponse, GeneratedDocumentResponse } from "@ai-context/contracts";

import {
  DocumentApiRequestError,
  generateDocument,
  regenerateDocument
} from "@/features/documents/api/document-api";
import { DocumentGenerationPanel } from "./document-generation-panel";

type QueryOptions = {
  enabled?: boolean;
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
};

type MutationOptions = {
  mutationFn: (input?: string) => Promise<GeneratedDocumentResponse>;
  onSuccess?: (document: GeneratedDocumentResponse) => Promise<void>;
};

type QueryState = {
  data?: DocumentHistoryResponse;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
};

let historyQuery: QueryState = {};
let selectedDocumentQuery: {
  data?: GeneratedDocumentResponse;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
} = {};
let queryOptions: QueryOptions[] = [];
let mutationOptions: MutationOptions[] = [];
let mutationStates: Array<{
  error?: unknown;
  isError: boolean;
  isPending: boolean;
}> = [];
const mutate = vi.fn();
const invalidateQueries = vi.fn(async () => undefined);
const setQueryData = vi.fn();

const firstDocument: GeneratedDocumentResponse = {
  id: "document_1",
  projectContextId: "project_context_1",
  contextId: "context:analysis_1:context-engine@1",
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content: "# Project Overview\n\n- Observed: first artifact.\n",
  createdAt: "2026-08-18T10:00:00.000Z"
};
const secondDocument: GeneratedDocumentResponse = {
  ...firstDocument,
  id: "document_2",
  content: "# Project Overview\n\n- Observed: regenerated artifact.\n",
  createdAt: "2026-08-18T11:00:00.000Z"
};

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    const index = mutationOptions.length;
    mutationOptions.push(options);

    return {
      data: undefined,
      isError: false,
      isPending: false,
      mutate,
      ...(mutationStates[index] ?? {})
    };
  },
  useQuery: (_options: QueryOptions) => {
    queryOptions.push(_options);

    return {
      isError: false,
      isFetching: false,
      isLoading: false,
      ...(_options.queryKey[0] === "document" ? selectedDocumentQuery : historyQuery)
    };
  },
  useQueryClient: () => ({
    invalidateQueries,
    setQueryData
  })
}));

vi.mock("@/features/documents/api/document-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    generateDocument: vi.fn(),
    regenerateDocument: vi.fn()
  };
});

describe("DocumentGenerationPanel", () => {
  beforeEach(() => {
    historyQuery = { data: { documents: [] } };
    selectedDocumentQuery = {};
    queryOptions = [];
    mutationOptions = [];
    mutationStates = [];
    mutate.mockReset();
    invalidateQueries.mockClear();
    setQueryData.mockClear();
    vi.mocked(generateDocument).mockReset();
    vi.mocked(regenerateDocument).mockReset();
  });

  it("renders an empty state for a ProjectContext without generated documents", () => {
    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("Document Generation");
    expect(markup).toContain("No documents generated yet.");
    expect(markup).toContain("Generate Project Overview");
  });

  it("generates a Project Overview through the document API", async () => {
    vi.mocked(generateDocument).mockResolvedValue(firstDocument);
    renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    await mutationOptions[0]?.mutationFn();
    await mutationOptions[0]?.onSuccess?.(firstDocument);

    expect(generateDocument).toHaveBeenCalledWith("access_token", {
      contextId: "project_context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(setQueryData).toHaveBeenCalledWith(["document", "document_1"], firstDocument);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["document-history", "project_context_1"]
    });
  });

  it("shows loading state that disables duplicate generation", () => {
    mutationStates = [{ isError: false, isPending: true }];

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("Generating");
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-busy="true"');
  });

  it("displays generated content exactly from the API response", () => {
    historyQuery = { data: { documents: [firstDocument] } };

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("# Project Overview");
    expect(markup).toContain("- Observed: first artifact.");
    expect(markup).toContain("document-generator@1");
    expect(markup).toContain("context:analysis_1:context-engine@1");
  });

  it("renders multiple immutable history artifacts", () => {
    historyQuery = { data: { documents: [secondDocument, firstDocument] } };

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("document_2");
    expect(markup).toContain("document_1");
    expect(markup).toContain("- Observed: regenerated artifact.");
    expect(markup).not.toContain("Document A updated");
  });

  it("regenerates the selected artifact without replacing the old history item", async () => {
    historyQuery = { data: { documents: [firstDocument] } };
    vi.mocked(regenerateDocument).mockResolvedValue(secondDocument);
    renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    await mutationOptions[1]?.mutationFn(firstDocument.id);
    await mutationOptions[1]?.onSuccess?.(secondDocument);

    expect(regenerateDocument).toHaveBeenCalledWith("access_token", "document_1");
    expect(setQueryData).toHaveBeenCalledWith(["document", "document_2"], secondDocument);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["document-history", "project_context_1"]
    });
  });

  it("shows safe document errors", () => {
    historyQuery = {
      error: new DocumentApiRequestError("Authorization Bearer secret-token", 403),
      isError: true
    };

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("You do not have access to these documents.");
    expect(markup).not.toContain("Authorization");
    expect(markup).not.toContain("secret-token");
  });

  it("does not locally generate Markdown from ProjectContext data", () => {
    historyQuery = { data: { documents: [] } };

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).not.toContain("## Technology");
    expect(markup).not.toContain("Observed:");
    expect(markup).not.toContain("Inferred:");
  });
});
