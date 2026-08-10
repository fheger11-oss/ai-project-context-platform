import { Play, ScanLine } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanApiRequestError, startScan } from "@/features/scans/api/scan-api";
import type { ScanSnapshot } from "@/features/scans/api/scan-api";

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

    return "Scan could not be started.";
  }

  return "Network problem. Check your connection and try again.";
}

export function RepositoryScanAction({ accessToken, repositoryId }: RepositoryScanActionProps) {
  const queryClient = useQueryClient();
  const canStartScan = Boolean(accessToken);
  const scanMutation = useMutation({
    mutationFn: () => startScan(accessToken, repositoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scan-history", repositoryId] });
    }
  });
  const scan = scanMutation.data;
  const feedbackId = `scan-feedback-${repositoryId}`;

  function handleStartScan() {
    if (!canStartScan || scanMutation.isPending) {
      return;
    }

    scanMutation.mutate();
  }

  return (
    <div className="grid gap-3 rounded-md border bg-card/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">Scan</h3>
          <p className="mt-1 text-xs text-muted-foreground">Start a backend repository snapshot.</p>
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
          {scanMutation.isPending ? "Scanning" : "Start Scan"}
        </Button>
      </div>

      <div id={feedbackId} className="grid gap-2" aria-live="polite">
        {!canStartScan ? (
          <p className="text-sm text-muted-foreground" role="status">
            Sign in again to start a scan.
          </p>
        ) : null}

        {scanMutation.isPending ? (
          <p className="text-sm text-muted-foreground" role="status">
            Scan request is running.
          </p>
        ) : null}
      </div>

      {scan ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <p className="text-sm font-medium text-primary">Scan result received.</p>
          <ScanSnapshotSummary scan={scan} />
        </div>
      ) : null}

      {scanMutation.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {scanErrorMessage(scanMutation.error)}
        </p>
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
          <Badge tone={scan.status === "COMPLETED" ? "success" : "muted"}>{scan.status}</Badge>
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
