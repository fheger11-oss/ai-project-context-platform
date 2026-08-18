import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectContextHistoryResponse, ProjectContextResponse } from "@ai-context/contracts";

import { ContextApiRequestError, generateProjectContext } from "@/features/context/api/context-api";
import { ProjectContextPanel } from "./project-context-panel";

type QueryOptions = {
  queryKey: readonly unknown[];
};

type MutationOptions = {
  mutationFn: () => Promise<ProjectContextResponse>;
  onSuccess?: (context: ProjectContextResponse) => Promise<void>;
};

type QueryState = {
  data?: unknown;
  error?: unknown;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
};

let latestQuery: QueryState = {};
let selectedQuery: QueryState = {};
let historyQuery: QueryState = {};
let mutationOptions: MutationOptions | null = null;
let mutationState: {
  error?: unknown;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
} = { isError: false, isPending: false, isSuccess: false };
const mutate = vi.fn();
const invalidateQueries = vi.fn(async () => undefined);
const setQueryData = vi.fn();

const context: ProjectContextResponse = {
  id: "project_context_1",
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: "2026-08-17T10:00:00.000Z",
  createdAt: "2026-08-17T10:00:01.000Z",
  project: {
    claims: [
      {
        value: { type: "APPLICATION_TYPE", applicationType: "BACKEND" },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: []
      }
    ]
  },
  technology: { claims: [] },
  structure: { claims: [] },
  architecture: { claims: [] },
  entryPoints: { claims: [] },
  testing: { claims: [] },
  infrastructure: { claims: [] },
  ambiguities: []
};

const history: ProjectContextHistoryResponse = {
  items: [
    {
      id: "project_context_1",
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@5.7.1",
      generatedAt: "2026-08-17T10:00:00.000Z",
      createdAt: "2026-08-17T10:00:01.000Z"
    }
  ]
};

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    mutationOptions = options;

    return {
      ...mutationState,
      mutate
    };
  },
  useQuery: (options: QueryOptions) => {
    const key = options.queryKey.join(":");

    if (key.startsWith("context:latest")) {
      return {
        isError: false,
        isFetching: false,
        isLoading: false,
        ...latestQuery
      };
    }

    if (key.startsWith("context-history")) {
      return {
        isError: false,
        isFetching: false,
        isLoading: false,
        ...historyQuery
      };
    }

    return {
      isError: false,
      isFetching: false,
      isLoading: false,
      ...selectedQuery
    };
  },
  useQueryClient: () => ({
    invalidateQueries,
    setQueryData
  })
}));

vi.mock("@/features/context/api/context-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    generateProjectContext: vi.fn()
  };
});

vi.mock("@/features/documents/components/document-generation-panel", () => ({
  DocumentGenerationPanel: ({ contextId }: { contextId: string }) => (
    <section>Document Generation for {contextId}</section>
  )
}));

describe("ProjectContextPanel", () => {
  beforeEach(() => {
    latestQuery = { data: context };
    selectedQuery = {};
    historyQuery = { data: history };
    mutationOptions = null;
    mutationState = { isError: false, isPending: false, isSuccess: false };
    mutate.mockReset();
    invalidateQueries.mockClear();
    setQueryData.mockClear();
    vi.mocked(generateProjectContext).mockReset();
  });

  it("renders latest Context, history, and Generate Again action", () => {
    const markup = renderToStaticMarkup(
      <ProjectContextPanel accessToken="access_token" analysisId="analysis_1" />
    );

    expect(markup).toContain("Project Context");
    expect(markup).toContain("Generate Again");
    expect(markup).toContain("APPLICATION_TYPE");
    expect(markup).toContain("Document Generation for project_context_1");
    expect(markup).toContain("Context History");
    expect(markup).toContain("context-engine@5.7.1");
  });

  it("renders empty state when no persisted Context exists", () => {
    latestQuery = {
      error: new ContextApiRequestError("Context was not found", 404),
      isError: true
    };
    historyQuery = { data: { items: [] } };

    const markup = renderToStaticMarkup(
      <ProjectContextPanel accessToken="access_token" analysisId="analysis_1" />
    );

    expect(markup).toContain("No Context has been generated for this analysis yet.");
    expect(markup).toContain("No Context history yet.");
  });

  it("generates Context through the API and refreshes latest/history queries", async () => {
    vi.mocked(generateProjectContext).mockResolvedValue(context);
    renderToStaticMarkup(
      <ProjectContextPanel accessToken="access_token" analysisId="analysis_1" />
    );

    await mutationOptions?.mutationFn();
    await mutationOptions?.onSuccess?.(context);

    expect(generateProjectContext).toHaveBeenCalledWith("access_token", "analysis_1");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["context", "latest", "analysis_1"]
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["context-history", "analysis_1"]
    });
    expect(setQueryData).toHaveBeenCalledWith(["context", "project_context_1"], context);
  });

  it("renders generate loading state", () => {
    mutationState = { isError: false, isPending: true, isSuccess: false };

    const markup = renderToStaticMarkup(
      <ProjectContextPanel accessToken="access_token" analysisId="analysis_1" />
    );

    expect(markup).toContain("Generating");
  });
});
