import {
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCode2,
  History,
  RotateCw,
  ScanLine
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisApiRequestError, getAnalysisHistory } from "@/features/analysis/api/analysis-api";
import { StartAnalysisButton } from "@/features/analysis/components/start-analysis-button";
import { getScanHistory, ScanApiRequestError } from "@/features/scans/api/scan-api";
import { scanStatusLabel, scanStatusTone } from "@/features/scans/utils/scan-status";
import type { AnalysisHistoryItem } from "@/features/analysis/api/analysis-api";
import type { ScanHistoryResponse, ScanSnapshot } from "@/features/scans/api/scan-api";

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="inline-flex items-center gap-2">
            <History className="size-4" />
            Project activity
          </CardTitle>
          <CardDescription>Repository scans and available analysis actions.</CardDescription>
        </div>
        {isFetching && !isLoading ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCw className="size-3.5 animate-spin" />
            Refreshing
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="grid gap-3">
        {isLoading ? (
          <StatePanel
            description="Loading previous repository scans for this project."
            title="Loading project activity"
            tone="loading"
          />
        ) : null}

        {isError ? (
          <StatePanel
            description={historyErrorMessage(error)}
            title="Project activity unavailable"
            tone="error"
          />
        ) : null}

        {!isLoading && !isError && scans.length === 0 ? (
          <StatePanel
            description="Start a scan to capture the repository snapshot that can be analyzed next."
            title="No scans yet"
            tone="empty"
          />
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
      </CardContent>
    </Card>
  );
}

function ScanHistoryItem({ accessToken, scan }: { accessToken: string; scan: ScanSnapshot }) {
  const analysisHistoryQuery = useQuery({
    queryKey: ["analysis-history", scan.id],
    queryFn: () => getAnalysisHistory(accessToken, scan.id),
    enabled: Boolean(accessToken && scan.status === "COMPLETED")
  });

  return (
    <article className="grid gap-3 rounded-md border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background/50">
            <ScanLine className="size-4 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-foreground">
              Scan {scanStatusLabel(scan.status).toLowerCase()}
            </h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Created {displayDate(scan.createdAt)}
            </p>
          </div>
        </div>
        <Badge tone={scanStatusTone(scan.status)}>{scanStatusLabel(scan.status)}</Badge>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 rounded-md border bg-background/45 p-3">
          <dt className="text-xs text-muted-foreground">Files</dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 text-foreground">
            <FileCode2 className="size-3.5 text-muted-foreground" />
            {scan.totalFiles}
          </dd>
        </div>
        <div className="min-w-0 rounded-md border bg-background/45 p-3">
          <dt className="text-xs text-muted-foreground">Size</dt>
          <dd className="mt-1 text-foreground">{scan.totalSize} bytes</dd>
        </div>
        <div className="min-w-0 rounded-md border bg-background/45 p-3">
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="mt-1 text-foreground">{displayDuration(scan.durationMs)}</dd>
        </div>
        <div className="min-w-0 rounded-md border bg-background/45 p-3">
          <dt className="text-xs text-muted-foreground">Completed</dt>
          <dd className="mt-1 truncate text-foreground" title={displayDate(scan.completedAt)}>
            {displayDate(scan.completedAt)}
          </dd>
        </div>
      </dl>

      <details className="rounded-md border border-border bg-background/35">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Technical provenance
        </summary>
        <dl className="grid gap-3 border-t p-3 text-xs sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Commit</dt>
            <dd className="mt-1 truncate font-mono text-subtle-foreground" title={scan.commitSha}>
              {scan.commitSha}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Started</dt>
            <dd
              className="mt-1 truncate text-subtle-foreground"
              title={displayDate(scan.startedAt)}
            >
              {displayDate(scan.startedAt)}
            </dd>
          </div>
        </dl>
      </details>

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
      <StatePanel
        className="p-3"
        description="Checking whether this scan already has analysis results."
        title="Loading analysis"
        tone="loading"
      />
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
      <div className="grid gap-2 rounded-md border border-dashed p-3">
        <p className="text-sm font-medium text-foreground">Ready for analysis</p>
        <p className="text-sm text-muted-foreground">
          Analyze this completed scan to detect structure and dependencies.
        </p>
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
            Analysis available
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Analyzed {displayDate(latest.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to={`/analyses/${encodeURIComponent(latest.analysisId)}`}>
              <Eye />
              View analysis
            </Link>
          </Button>
          <StartAnalysisButton
            accessToken={accessToken}
            label="Analyze again"
            pendingLabel="Analyzing again"
            scanId={scanId}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-xs uppercase text-muted-foreground">Analysis history</p>
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
