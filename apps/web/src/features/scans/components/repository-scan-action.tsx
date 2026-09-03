import { Play, ScanLine } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getScanLimits, ScanApiRequestError, startScan } from "@/features/scans/api/scan-api";
import type { ScanSnapshot } from "@/features/scans/api/scan-api";
import {
  ScanLimitAlert,
  ScanLimitsSummary,
  ScanUsagePanel
} from "@/features/scans/components/scan-usage";
import { scanStatusLabel, scanStatusTone } from "@/features/scans/utils/scan-status";

type RepositoryScanActionProps = {
  accessToken: string;
  repositoryId: string;
};

function scanErrorMessage(error: unknown): string {
  if (error instanceof ScanApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to start a scan.";
    }

    if (error.status === 404) {
      return "This repository is not available for scanning.";
    }

    if (error.details?.code === "SCAN_LIMIT_REACHED") {
      return "Scan limit reached.";
    }

    return "Scan could not be started.";
  }

  return "Network problem. Check your connection and try again.";
}

export function RepositoryScanAction({ accessToken, repositoryId }: RepositoryScanActionProps) {
  const queryClient = useQueryClient();
  const canStartScan = Boolean(accessToken);
  const limitsQuery = useQuery({
    queryKey: ["scan-limits"],
    queryFn: () => getScanLimits(accessToken)
  });
  const scanMutation = useMutation({
    mutationFn: () => startScan(accessToken, repositoryId),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["scan-history", repositoryId] })
      ]);
    }
  });
  const scan = scanMutation.data;
  const limits = limitsQuery.data;
  const limitError =
    scanMutation.error instanceof ScanApiRequestError ? scanMutation.error.details : undefined;
  const feedbackId = `scan-feedback-${repositoryId}`;

  function handleStartScan() {
    if (!canStartScan || scanMutation.isPending) {
      return;
    }

    scanMutation.mutate();
  }

  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">Scan</h3>
          <p className="mt-1 text-xs text-muted-foreground">Capture the repository for analysis.</p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!canStartScan || scanMutation.isPending}
          aria-busy={scanMutation.isPending}
          aria-describedby={feedbackId}
          onClick={handleStartScan}
        >
          {scanMutation.isPending ? <ScanLine /> : <Play />}
          {scanMutation.isPending ? "Scanning" : "Start scan"}
        </Button>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Scans process repository content from GitHub and store eligible non-binary source content
        for analysis while this repository remains connected. Obvious sensitive files are skipped;
        AI Export does not send repository content to an external AI provider in the current MVP.
      </p>

      {limits ? (
        <div className="grid gap-2 rounded-md border border-border bg-background/35 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Scan limits</p>
          <ScanLimitsSummary limits={limits} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Loading scan limits.</p>
      )}

      <div id={feedbackId} className="grid gap-2" aria-live="polite">
        {!canStartScan ? (
          <p className="text-sm text-muted-foreground" role="status">
            Sign in again to start a scan.
          </p>
        ) : null}

        {scanMutation.isPending ? (
          <div className="grid gap-2" role="status">
            <p className="text-sm text-muted-foreground">Scanning repository.</p>
            {limits ? (
              <ScanUsagePanel limits={limits} title="Running scan" variant="compact" />
            ) : null}
            <p className="text-xs text-muted-foreground">
              Live counters are not available until the scan returns.
            </p>
          </div>
        ) : null}
      </div>

      {scan ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <p className="text-sm font-medium text-primary">Repository snapshot captured.</p>
          <ScanSnapshotSummary scan={scan} />
          {limits ? <ScanUsagePanel limits={limits} scan={scan} /> : null}
        </div>
      ) : null}

      {scanMutation.isError ? (
        <div role="alert">
          {limitError ? (
            <ScanLimitAlert error={limitError} limits={limits} />
          ) : (
            <p className="text-sm text-destructive">{scanErrorMessage(scanMutation.error)}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ScanSnapshotSummary({ scan }: { scan: ScanSnapshot }) {
  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <Badge tone={scanStatusTone(scan.status)}>{scanStatusLabel(scan.status)}</Badge>
        </dd>
      </div>
      <div className="grid gap-1">
        <dt className="text-muted-foreground">Commit</dt>
        <dd className="truncate font-mono text-xs" title={scan.commitSha}>
          {scan.commitSha}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted-foreground">Files</dt>
        <dd>{scan.totalFiles}</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted-foreground">Size</dt>
        <dd>{scan.totalSize} bytes</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted-foreground">Duration</dt>
        <dd>{scan.durationMs} ms</dd>
      </div>
    </dl>
  );
}
