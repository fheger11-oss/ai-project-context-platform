import { ChevronLeft, ChevronRight, History, RotateCw } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getScanHistory, ScanApiRequestError } from "@/features/scans/api/scan-api";
import type { ScanHistoryResponse, ScanSnapshot, ScanStatus } from "@/features/scans/api/scan-api";

const HISTORY_PAGE_SIZE = 20;

type ScanHistoryProps = {
  accessToken: string;
  repositoryId: string;
};

type ScanHistoryContentProps = {
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

export function ScanHistory({ accessToken, repositoryId }: ScanHistoryProps) {
  const [page, setPage] = useState(1);
  const historyQuery = useQuery({
    queryKey: ["scan-history", repositoryId, page, HISTORY_PAGE_SIZE],
    queryFn: () => getScanHistory(accessToken, repositoryId, page, HISTORY_PAGE_SIZE),
    enabled: Boolean(accessToken && repositoryId)
  });

  return (
    <ScanHistoryContent
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
          ? scans.map((scan) => <ScanHistoryItem key={scan.id} scan={scan} />)
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

function ScanHistoryItem({ scan }: { scan: ScanSnapshot }) {
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
    </article>
  );
}
