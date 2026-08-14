import { BarChart3, ChevronLeft, ChevronRight, Eye, History, RotateCw } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalysisApiRequestError, getAnalysisHistory } from "@/features/analysis/api/analysis-api";
import { StartAnalysisButton } from "@/features/analysis/components/start-analysis-button";
import { getScanHistory, ScanApiRequestError } from "@/features/scans/api/scan-api";
import type { AnalysisHistoryItem } from "@/features/analysis/api/analysis-api";
import type { ScanHistoryResponse, ScanSnapshot, ScanStatus } from "@/features/scans/api/scan-api";

const HISTORY_PAGE_SIZE = 20;

type ScanHistoryProps = {
  accessToken: string;
  repositoryId: string;
};

type ScanHistoryContentProps = {
  accessToken: string;
  data: ScanHistoryResponse | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

function historyErrorMessage(error: unknown): string {
  if (error instanceof ScanApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to load scan history.";
    }

    if (error.status === 404) {
      return "Scan history is not available for this repository.";
    }
  }

  return "Scan history could not be loaded.";
}

function scanStatusTone(status: ScanStatus): "neutral" | "success" | "muted" {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "CANCELLED") {
    return "muted";
  }

  return "neutral";
}

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function displayDuration(durationMs: number | null): string {
  return durationMs === null ? "Not available" : `${durationMs} ms`;
}

function analysisHistoryErrorMessage(error: unknown): string {
  if (error instanceof AnalysisApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to load analysis history.";
    }

    if (error.status === 403 || error.status === 404) {
      return "Analysis history is not available for this scan.";
    }
  }

  return "Analysis history could not be loaded.";
}

export function ScanHistory({ accessToken, repositoryId }: ScanHistoryProps) {
  const [page, setPage] = useState(1);
  const historyQuery = useQuery({
    queryKey: ["scan-history", repositoryId, page, HISTORY_PAGE_SIZE],
    queryFn: () => getScanHistory(accessToken, repositoryId, page, HISTORY_PAGE_SIZE),
    enabled: Boolean(accessToken && repositoryId)
  });

  return (
    <ScanHistoryContent
      accessToken={accessToken}
      data={historyQuery.data}
      error={historyQuery.error}
      isError={historyQuery.isError}
      isFetching={historyQuery.isFetching}
      isLoading={historyQuery.isLoading}
      onPageChange={setPage}
    />
  );
}

export function ScanHistoryContent({
  accessToken,
  data,
  error,
  isError,
  isFetching,
  isLoading,
  onPageChange
}: ScanHistoryContentProps) {
  const scans = data?.items ?? [];
  const pagination = data?.pagination;
  const showPagination = Boolean(pagination && pagination.totalPages > 0);

  return (
    <section className="rounded-md border bg-card/70">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="inline-flex items-center gap-2 text-sm font-medium">
            <History className="size-4" />
            Scan History
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Previous backend repository snapshots.
          </p>
        </div>
        {isFetching && !isLoading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCw className="size-3.5" />
            Refreshing
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 p-4">
        {isLoading ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Loading scan history.
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {historyErrorMessage(error)}
          </div>
        ) : null}

        {!isLoading && !isError && scans.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No scans yet.
          </div>
        ) : null}

        {!isLoading && !isError
          ? scans.map((scan) => (
              <ScanHistoryItem key={scan.id} accessToken={accessToken} scan={scan} />
            ))
          : null}

        {showPagination && pagination ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1 || isFetching}
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages || isFetching}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ScanHistoryItem({ accessToken, scan }: { accessToken: string; scan: ScanSnapshot }) {
  const analysisHistoryQuery = useQuery({
    queryKey: ["analysis-history", scan.id],
    queryFn: () => getAnalysisHistory(accessToken, scan.id),
    enabled: Boolean(accessToken && scan.status === "COMPLETED")
  });

  return (
    <article className="grid gap-3 rounded-md border bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone={scanStatusTone(scan.status)}>{scan.status}</Badge>
        <span className="text-xs text-muted-foreground">Created {displayDate(scan.createdAt)}</span>
      </div>

      <div className="grid gap-1">
        <p className="text-xs uppercase text-muted-foreground">Commit</p>
        <p className="truncate font-mono text-xs" title={scan.commitSha}>
          {scan.commitSha}
        </p>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Files</dt>
          <dd>{scan.totalFiles}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Size</dt>
          <dd>{scan.totalSize} bytes</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd>{displayDuration(scan.durationMs)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Started</dt>
          <dd>{displayDate(scan.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Completed</dt>
          <dd>{displayDate(scan.completedAt)}</dd>
        </div>
      </dl>

      {scan.status === "COMPLETED" ? (
        <div className="border-t pt-3">
          <AnalysisActions
            accessToken={accessToken}
            error={analysisHistoryQuery.error}
            history={analysisHistoryQuery.data?.items ?? []}
            isError={analysisHistoryQuery.isError}
            isLoading={analysisHistoryQuery.isLoading}
            scanId={scan.id}
          />
        </div>
      ) : null}
    </article>
  );
}

function AnalysisActions({
  accessToken,
  error,
  history,
  isError,
  isLoading,
  scanId
}: {
  accessToken: string;
  error: unknown;
  history: readonly AnalysisHistoryItem[];
  isError: boolean;
  isLoading: boolean;
  scanId: string;
}) {
  const latest = history[0];

  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Loading analysis history.
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-destructive" role="alert">
          {analysisHistoryErrorMessage(error)}
        </p>
        <StartAnalysisButton accessToken={accessToken} scanId={scanId} />
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">No analysis yet.</p>
        <StartAnalysisButton accessToken={accessToken} scanId={scanId} />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4" />
            Analysis
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Analyzed {displayDate(latest.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to={`/analyses/${encodeURIComponent(latest.analysisId)}`}>
              <Eye />
              View Analysis
            </Link>
          </Button>
          <StartAnalysisButton
            accessToken={accessToken}
            label="Analyze Again"
            pendingLabel="Analyzing Again"
            scanId={scanId}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-xs uppercase text-muted-foreground">Analysis History</p>
        <div className="grid gap-2">
          {history.map((item) => (
            <AnalysisHistoryRow key={item.analysisId} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalysisHistoryRow({ item }: { item: AnalysisHistoryItem }) {
  return (
    <div className="grid gap-2 rounded-md border bg-card/60 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm">{displayDate(item.generatedAt)}</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={item.commitSha}>
          {item.commitSha}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{item.analyzerVersion}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to={`/analyses/${encodeURIComponent(item.analysisId)}`}>
          <Eye />
          View
        </Link>
      </Button>
    </div>
  );
}
