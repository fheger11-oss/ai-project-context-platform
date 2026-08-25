import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentHistoryResponse, GeneratedDocumentResponse } from "@ai-context/contracts";

import {
  createGenerateDocumentRequest,
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
const technicalDocument: GeneratedDocumentResponse = {
  ...firstDocument,
  id: "document_technical_1",
  documentType: "TECHNICAL_DOCUMENTATION",
  content: "# Technical Documentation\n\n## Technology Stack\n",
  createdAt: "2026-08-18T12:00:00.000Z"
};
const architectureDocument: GeneratedDocumentResponse = {
  ...firstDocument,
  id: "document_architecture_1",
  documentType: "ARCHITECTURE_DOCUMENT",
  content: "# Architecture Documentation\n\n## Modules\n",
  createdAt: "2026-08-18T13:00:00.000Z"
};
const moduleDocument: GeneratedDocumentResponse = {
  ...firstDocument,
  id: "document_module_1",
  documentType: "MODULE_DOCUMENTATION",
  content: "# Module Documentation\n\n## Module Index\n",
  createdAt: "2026-08-18T14:00:00.000Z"
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
    expect(markup).toContain("Document type");
    expect(markup).toContain('<option value="PROJECT_OVERVIEW" selected="">Project Overview');
    expect(markup).toContain('<option value="TECHNICAL_DOCUMENTATION">Technical Documentation');
    expect(markup).toContain('<option value="ARCHITECTURE_DOCUMENT">Architecture Documentation');
    expect(markup).toContain('<option value="MODULE_DOCUMENTATION">Module Documentation');
    expect(markup).toContain("No documents generated yet.");
    expect(markup).toContain("Generate Project Overview");
    expect(markup).toContain(
      "Generate Project Overview, Technical Documentation, Architecture Documentation, or Module Documentation"
    );
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

  it("creates the Technical Documentation request body for the existing document API", () => {
    expect(createGenerateDocumentRequest("project_context_1", "TECHNICAL_DOCUMENTATION")).toEqual({
      contextId: "project_context_1",
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
  });

  it("creates the Architecture Documentation request body for the existing document API", () => {
    expect(createGenerateDocumentRequest("project_context_1", "ARCHITECTURE_DOCUMENT")).toEqual({
      contextId: "project_context_1",
      documentType: "ARCHITECTURE_DOCUMENT",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
  });

  it("creates the Module Documentation request body for the existing document API", () => {
    expect(createGenerateDocumentRequest("project_context_1", "MODULE_DOCUMENTATION")).toEqual({
      contextId: "project_context_1",
      documentType: "MODULE_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
  });

  it("generates Technical Documentation through the existing document API when selected", async () => {
    vi.mocked(generateDocument).mockResolvedValue(technicalDocument);
    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel
        accessToken="access_token"
        contextId="project_context_1"
        initialDocumentType="TECHNICAL_DOCUMENTATION"
      />
    );

    await mutationOptions[0]?.mutationFn();
    await mutationOptions[0]?.onSuccess?.(technicalDocument);

    expect(markup).toContain("Generate Technical Documentation");
    expect(markup).toContain(
      '<option value="TECHNICAL_DOCUMENTATION" selected="">Technical Documentation'
    );
    expect(generateDocument).toHaveBeenCalledWith("access_token", {
      contextId: "project_context_1",
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(setQueryData).toHaveBeenCalledWith(
      ["document", "document_technical_1"],
      technicalDocument
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["document-history", "project_context_1"]
    });
  });

  it("generates Architecture Documentation through the existing document API when selected", async () => {
    vi.mocked(generateDocument).mockResolvedValue(architectureDocument);
    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel
        accessToken="access_token"
        contextId="project_context_1"
        initialDocumentType="ARCHITECTURE_DOCUMENT"
      />
    );

    await mutationOptions[0]?.mutationFn();
    await mutationOptions[0]?.onSuccess?.(architectureDocument);

    expect(markup).toContain("Generate Architecture Documentation");
    expect(markup).toContain(
      '<option value="ARCHITECTURE_DOCUMENT" selected="">Architecture Documentation'
    );
    expect(generateDocument).toHaveBeenCalledWith("access_token", {
      contextId: "project_context_1",
      documentType: "ARCHITECTURE_DOCUMENT",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(setQueryData).toHaveBeenCalledWith(
      ["document", "document_architecture_1"],
      architectureDocument
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["document-history", "project_context_1"]
    });
  });

  it("generates Module Documentation through the existing document API when selected", async () => {
    vi.mocked(generateDocument).mockResolvedValue(moduleDocument);
    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel
        accessToken="access_token"
        contextId="project_context_1"
        initialDocumentType="MODULE_DOCUMENTATION"
      />
    );

    await mutationOptions[0]?.mutationFn();
    await mutationOptions[0]?.onSuccess?.(moduleDocument);

    expect(markup).toContain("Generate Module Documentation");
    expect(markup).toContain(
      '<option value="MODULE_DOCUMENTATION" selected="">Module Documentation'
    );
    expect(generateDocument).toHaveBeenCalledWith("access_token", {
      contextId: "project_context_1",
      documentType: "MODULE_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(setQueryData).toHaveBeenCalledWith(["document", "document_module_1"], moduleDocument);
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

  it("displays Technical Documentation artifacts through the existing viewer and history UI", () => {
    historyQuery = { data: { documents: [technicalDocument] } };

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("Technical Documentation");
    expect(markup).toContain("# Technical Documentation");
    expect(markup).toContain("## Technology Stack");
    expect(markup).toContain("document_technical_1");
  });

  it("displays Architecture Documentation artifacts with a readable label", () => {
    historyQuery = { data: { documents: [architectureDocument] } };

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("Architecture Documentation");
    expect(markup).toContain("Architecture Documentation - MARKDOWN");
    expect(markup).toContain("# Architecture Documentation");
    expect(markup).toContain("## Modules");
    expect(markup).toContain("document_architecture_1");
  });

  it("displays Module Documentation artifacts with a readable label", () => {
    historyQuery = { data: { documents: [moduleDocument] } };

    const markup = renderToStaticMarkup(
      <DocumentGenerationPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("Module Documentation");
    expect(markup).toContain("Module Documentation - MARKDOWN");
    expect(markup).toContain("# Module Documentation");
    expect(markup).toContain("## Module Index");
    expect(markup).toContain("document_module_1");
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
