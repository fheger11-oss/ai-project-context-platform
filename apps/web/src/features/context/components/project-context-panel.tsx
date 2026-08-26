import { CalendarClock, Eye, FileText, RefreshCw, RotateCw } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContextApiRequestError,
  generateProjectContext,
  getLatestProjectContext,
  getProjectContext,
  getProjectContextHistory
} from "@/features/context/api/context-api";
import type { ProjectContextHistoryItem } from "@/features/context/api/context-api";
import { AiExportPanel } from "@/features/ai-export/components/ai-export-panel";
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

function GenerateContextButton({
  isPending,
  onGenerate,
  size = "md"
}: {
  isPending: boolean;
  onGenerate: () => void;
  size?: "md" | "sm";
}) {
  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={isPending}
      aria-busy={isPending}
      aria-label={isPending ? "Generating Project Context" : "Generate Project Context again"}
      onClick={onGenerate}
    >
      <RefreshCw className={isPending ? "animate-spin" : undefined} />
      {isPending ? "Generating" : "Generate Again"}
    </Button>
  );
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
  const isNotFound =
    activeError instanceof ContextApiRequestError &&
    activeError.status === 404 &&
    !selectedContextId;

  return (
    <section className="grid gap-4" aria-labelledby="project-context-title">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle id="project-context-title">Project Context</CardTitle>
            <CardDescription>
              Structured project knowledge generated from analysis, with claim-level evidence and
              provenance.
            </CardDescription>
            {activeContext ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  Generated {displayDate(activeContext.generatedAt)}
                </span>
                <span className="truncate font-mono" title={activeContext.contextVersion}>
                  {activeContext.contextVersion}
                </span>
                {selectedContextId ? <Badge tone="neutral">Historical version</Badge> : null}
              </div>
            ) : null}
          </div>
          <GenerateContextButton
            isPending={generateMutation.isPending}
            onGenerate={() => generateMutation.mutate()}
          />
        </CardHeader>

        <CardContent className="grid gap-3">
          {generateMutation.isError ? (
            <StatePanel
              description={contextErrorMessage(generateMutation.error)}
              title="Context generation failed"
              tone="error"
            />
          ) : null}

          {generateMutation.isSuccess ? (
            <StatePanel
              description="The generated Context is persisted and available below."
              title="Context generated"
              tone="success"
            />
          ) : null}

          {isActiveLoading ? (
            <StatePanel
              description="Loading the latest project Context for this analysis."
              title="Loading Context"
              tone="loading"
            />
          ) : null}

          {isActiveError ? (
            <StatePanel
              description={contextErrorMessage(activeError)}
              title="Context unavailable"
              tone={isNotFound ? "empty" : "error"}
              action={
                isNotFound ? (
                  <GenerateContextButton
                    isPending={generateMutation.isPending}
                    onGenerate={() => generateMutation.mutate()}
                    size="sm"
                  />
                ) : null
              }
            />
          ) : null}

          {activeContext ? (
            <>
              <ProjectContextDetails context={activeContext} />
              <section className="grid gap-3 rounded-md border bg-surface/60 p-4">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4 text-muted-foreground" />
                    Use this Context for documents
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Generated documents use the selected Context record as their source.
                  </p>
                </div>
              </section>
              <DocumentGenerationPanel accessToken={accessToken} contextId={activeContext.id} />
              <AiExportPanel accessToken={accessToken} contextId={activeContext.id} />
            </>
          ) : null}
        </CardContent>
      </Card>

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Context history</CardTitle>
          <CardDescription>Generated Context records for this analysis.</CardDescription>
        </div>
        {isFetching && !isLoading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCw className="size-3.5 animate-spin" />
            Refreshing
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="grid gap-2">
        {isLoading ? (
          <StatePanel
            description="Loading generated Context records for this analysis."
            title="Loading Context history"
            tone="loading"
          />
        ) : null}

        {isError ? (
          <StatePanel
            description="Context history could not be loaded."
            title="Context history unavailable"
            tone="error"
          />
        ) : null}

        {!isLoading && !isError && history.length === 0 ? (
          <StatePanel
            description="Generate Context from this analysis to create the first project knowledge record."
            title="No Context history yet"
            tone="empty"
          />
        ) : null}

        {!isLoading && !isError
          ? history.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 rounded-md border bg-surface/70 p-3 sm:grid-cols-[1fr_auto] sm:items-start"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">Context generated</p>
                    {item.id === activeContextId || item.id === selectedContextId ? (
                      <Badge tone="success">Viewing</Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      {displayDate(item.generatedAt)}
                    </span>
                    <span className="truncate font-mono" title={item.contextVersion}>
                      {item.contextVersion}
                    </span>
                  </div>
                  <details className="mt-3 rounded-md border border-border bg-background/40">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                      Source provenance
                    </summary>
                    <dl className="grid gap-2 border-t p-3 text-xs sm:grid-cols-2">
                      <HistoryRow label="Context row" value={item.id} />
                      <HistoryRow label="Analysis" value={item.analysisId} />
                      <HistoryRow label="Scan" value={item.scanId} />
                      <HistoryRow label="Repository" value={item.repositoryId} />
                      <HistoryRow label="Commit" value={item.commitSha} />
                      <HistoryRow label="Persisted" value={displayDate(item.createdAt)} />
                    </dl>
                  </details>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    item.id === activeContextId || item.id === selectedContextId
                      ? "default"
                      : "outline"
                  }
                  aria-current={
                    item.id === activeContextId || item.id === selectedContextId
                      ? "true"
                      : undefined
                  }
                  onClick={() => onSelect(item.id)}
                >
                  <Eye />
                  View
                </Button>
              </article>
            ))
          : null}
      </CardContent>
    </Card>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-subtle-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}
