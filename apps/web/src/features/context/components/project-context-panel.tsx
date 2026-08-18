import { Eye, RefreshCw, RotateCw } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  ContextApiRequestError,
  generateProjectContext,
  getLatestProjectContext,
  getProjectContext,
  getProjectContextHistory
} from "@/features/context/api/context-api";
import type { ProjectContextHistoryItem } from "@/features/context/api/context-api";
import { DocumentGenerationPanel } from "@/features/documents/components/document-generation-panel";
import { ProjectContextDetails } from "./project-context-details";

type ProjectContextPanelProps = {
  accessToken: string;
  analysisId: string;
};

function contextErrorMessage(error: unknown): string {
  if (error instanceof ContextApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to load Context.";
    }

    if (error.status === 403) {
      return "You do not have access to this Context.";
    }

    if (error.status === 404) {
      return "No Context has been generated for this analysis yet.";
    }

    return "Context could not be loaded.";
  }

  return "Network problem. Check your connection and try again.";
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function ProjectContextPanel({ accessToken, analysisId }: ProjectContextPanelProps) {
  const queryClient = useQueryClient();
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const latestQuery = useQuery({
    queryKey: ["context", "latest", analysisId],
    queryFn: () => getLatestProjectContext(accessToken, analysisId),
    enabled: Boolean(accessToken && analysisId && !selectedContextId)
  });
  const selectedQuery = useQuery({
    queryKey: ["context", selectedContextId],
    queryFn: () => getProjectContext(accessToken, selectedContextId ?? ""),
    enabled: Boolean(accessToken && selectedContextId)
  });
  const historyQuery = useQuery({
    queryKey: ["context-history", analysisId],
    queryFn: () => getProjectContextHistory(accessToken, analysisId),
    enabled: Boolean(accessToken && analysisId)
  });
  const generateMutation = useMutation({
    mutationFn: () => generateProjectContext(accessToken, analysisId),
    onSuccess: async (context) => {
      setSelectedContextId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["context", "latest", analysisId] }),
        queryClient.invalidateQueries({ queryKey: ["context-history", analysisId] }),
        queryClient.setQueryData(["context", context.id], context)
      ]);
    }
  });
  const activeContext = selectedContextId ? selectedQuery.data : latestQuery.data;
  const activeError = selectedContextId ? selectedQuery.error : latestQuery.error;
  const isActiveLoading = selectedContextId ? selectedQuery.isLoading : latestQuery.isLoading;
  const isActiveError = selectedContextId ? selectedQuery.isError : latestQuery.isError;

  return (
    <section className="grid gap-4">
      <div className="rounded-md border bg-card/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">Project Context</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Persisted deterministic Context generated from this Analysis.
            </p>
          </div>
          <Button
            type="button"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            <RefreshCw />
            {generateMutation.isPending ? "Generating" : "Generate Again"}
          </Button>
        </div>

        <div className="grid gap-3 p-4">
          {generateMutation.isError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {contextErrorMessage(generateMutation.error)}
            </p>
          ) : null}

          {generateMutation.isSuccess ? (
            <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              Context generated and persisted.
            </p>
          ) : null}

          {isActiveLoading ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Loading Context.
            </p>
          ) : null}

          {isActiveError ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {contextErrorMessage(activeError)}
            </p>
          ) : null}

          {activeContext ? (
            <>
              <ProjectContextDetails context={activeContext} />
              <DocumentGenerationPanel accessToken={accessToken} contextId={activeContext.id} />
            </>
          ) : null}
        </div>
      </div>

      <ContextHistory
        activeContextId={activeContext?.id ?? null}
        history={historyQuery.data?.items ?? []}
        isError={historyQuery.isError}
        isFetching={historyQuery.isFetching}
        isLoading={historyQuery.isLoading}
        onSelect={(contextId) => setSelectedContextId(contextId)}
        selectedContextId={selectedContextId}
      />
    </section>
  );
}

function ContextHistory({
  activeContextId,
  history,
  isError,
  isFetching,
  isLoading,
  onSelect,
  selectedContextId
}: {
  activeContextId: string | null;
  history: readonly ProjectContextHistoryItem[];
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onSelect: (contextId: string | null) => void;
  selectedContextId: string | null;
}) {
  return (
    <section className="rounded-md border bg-card/70">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Context History</h2>
          <p className="mt-1 text-xs text-muted-foreground">Immutable generated Context records.</p>
        </div>
        {isFetching && !isLoading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCw className="size-3.5" />
            Refreshing
          </span>
        ) : null}
      </div>

      <div className="grid gap-2 p-4">
        {isLoading ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Loading Context history.
          </p>
        ) : null}

        {isError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Context history could not be loaded.
          </p>
        ) : null}

        {!isLoading && !isError && history.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No Context history yet.
          </p>
        ) : null}

        {!isLoading && !isError
          ? history.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-md border bg-background/70 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm">{displayDate(item.generatedAt)}</p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {item.contextVersion}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {item.commitSha}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    item.id === activeContextId || item.id === selectedContextId
                      ? "default"
                      : "outline"
                  }
                  onClick={() => onSelect(item.id)}
                >
                  <Eye />
                  View
                </Button>
              </div>
            ))
          : null}
      </div>
    </section>
  );
}
