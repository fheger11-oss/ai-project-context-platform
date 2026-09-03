import { AlertTriangle, BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  ScanLimitErrorResponse,
  ScanLimits,
  ScanSnapshot,
  ScanUsage
} from "@/features/scans/api/scan-api";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  limitReasonLabel,
  scanLimitErrorMessage
} from "@/features/scans/utils/scan-usage";

type ScanUsagePanelProps = {
  className?: string;
  limits: ScanLimits;
  scan?: Pick<ScanSnapshot, "limit" | "status" | "usage"> | null;
  title?: string;
  variant?: "compact" | "card";
};

export function ScanLimitsSummary({ limits }: { limits: ScanLimits }) {
  return (
    <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
      <div>
        <dt>Files</dt>
        <dd className="mt-1 font-medium text-foreground">{limits.maxFiles.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Non-binary file</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatBytes(limits.maxIndividualFileSizeBytes)}
        </dd>
      </div>
      <div>
        <dt>Total file data</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatBytes(limits.maxTotalSizeBytes)}
        </dd>
      </div>
    </dl>
  );
}

export function ScanUsagePanel({
  className,
  limits,
  scan,
  title = "Current scan",
  variant = "card"
}: ScanUsagePanelProps) {
  const usage = scan?.usage ?? emptyUsage();
  const filesPercent = boundedPercent(usage.filesProcessed, limits.maxFiles);
  const dataPercent = boundedPercent(usage.totalBytesConsidered, limits.maxTotalSizeBytes);
  const hasScan = Boolean(scan);
  const isLimitFailure = Boolean(scan?.limit.reached);

  return (
    <section
      className={cn(
        "grid gap-3 rounded-md border border-border bg-surface/70 p-3",
        variant === "compact" && "min-w-64 max-w-80 gap-2 py-2",
        className
      )}
      aria-label="Current scan usage"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <BarChart3 className="size-3.5 text-primary" />
          {title}
        </p>
        {isLimitFailure ? (
          <Badge tone="warning">{limitReasonLabel(scan?.limit.reason ?? null)}</Badge>
        ) : null}
      </div>

      {!hasScan ? (
        <p className="text-xs text-muted-foreground">Per-scan usage appears after a scan runs.</p>
      ) : null}

      <UsageMeter
        label="Files"
        value={`${usage.filesProcessed.toLocaleString()} / ${limits.maxFiles.toLocaleString()}`}
        percent={filesPercent}
      />
      <UsageMeter
        label="Data"
        value={`${formatBytes(usage.totalBytesConsidered)} / ${formatBytes(limits.maxTotalSizeBytes)}`}
        percent={dataPercent}
      />
      <p className="text-xs text-muted-foreground">
        Max individual non-binary file: {formatBytes(limits.maxIndividualFileSizeBytes)}.
      </p>
    </section>
  );
}

export function ScanUsagePill({
  limits,
  scan
}: {
  limits: ScanLimits;
  scan?: Pick<ScanSnapshot, "limit" | "usage"> | null;
}) {
  const usage = scan?.usage ?? emptyUsage();

  return (
    <section
      className="hidden h-9 max-w-[22rem] items-center gap-3 rounded-md border border-border bg-surface-raised px-3 text-xs shadow-[var(--shadow-control)] xl:flex"
      aria-label="Current scan usage"
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
        <BarChart3 className="size-3.5 text-primary" />
        Current scan
      </span>
      <span className="text-foreground">
        {usage.filesProcessed.toLocaleString()} / {limits.maxFiles.toLocaleString()} files
      </span>
      <span className="text-muted-foreground">
        {formatBytes(usage.totalBytesConsidered)} / {formatBytes(limits.maxTotalSizeBytes)}
      </span>
      {scan?.limit.reached ? (
        <span className="text-warning">{limitReasonLabel(scan.limit.reason)}</span>
      ) : null}
    </section>
  );
}

export function ScanLimitAlert({
  error,
  limits
}: {
  error?: ScanLimitErrorResponse;
  limits?: ScanLimits | undefined;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
      <p className="inline-flex items-center gap-2 font-medium text-foreground">
        <AlertTriangle className="size-4 text-warning" />
        Scan limit reached
      </p>
      <p className="text-muted-foreground">{scanLimitErrorMessage(error)}</p>
      {error.filePath ? (
        <p className="truncate font-mono text-xs text-muted-foreground" title={error.filePath}>
          {error.filePath}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">Reduce the repository scope and scan again.</p>
      {limits ? <ScanLimitsSummary limits={limits} /> : null}
    </div>
  );
}

function UsageMeter({ label, percent, value }: { label: string; percent: number; value: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function emptyUsage(): ScanUsage {
  return {
    filesProcessed: 0,
    totalBytesConsidered: "0"
  };
}

function boundedPercent(value: string | number, max: number): number {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(numeric) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (numeric / max) * 100));
}
