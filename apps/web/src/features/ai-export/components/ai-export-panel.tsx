import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  Eye,
  FileJson2,
  PackageCheck,
  RotateCw
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AiExportFormat, AiExportResponse } from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsList, TabTrigger } from "@/components/ui/tabs";
import {
  AiExportApiRequestError,
  downloadAiExport,
  getAiExport
} from "@/features/ai-export/api/ai-export-api";
import { triggerDownload } from "@/features/ai-export/utils/download-ai-export";

const FORMAT_OPTIONS: readonly { format: AiExportFormat; label: string }[] = [
  { format: "AI_CONTEXT", label: "AI Context" },
  { format: "MARKDOWN", label: "Markdown" },
  { format: "TEXT", label: "Plain Text" }
];

type AiExportPanelProps = {
  accessToken: string;
  contextId: string;
};

type ExportStatus =
  { kind: "idle" } | { kind: "success"; message: string } | { kind: "error"; message: string };

function exportErrorMessage(error: unknown): string {
  if (error instanceof AiExportApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to export this Context.";
    }

    if (error.status === 403) {
      return "You do not have access to export this Context.";
    }

    if (error.status === 404) {
      return "The selected Context is no longer available.";
    }

    if (error.status === 400) {
      return "The selected export format is not available.";
    }

    return "Unable to generate export. Please try again.";
  }

  return "Network problem. Check your connection and try again.";
}

export function AiExportPanel({ accessToken, contextId }: AiExportPanelProps) {
  const [format, setFormat] = useState<AiExportFormat>("AI_CONTEXT");
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" });
  const [preview, setPreview] = useState<AiExportResponse | null>(null);
  const previewMutation = useMutation({
    mutationFn: () => getAiExport(accessToken, { contextId, format }),
    onSuccess: (exported) => {
      setPreview(exported);
      setStatus({
        kind: "success",
        message: `${labelForFormat(exported.format)} export preview is ready.`
      });
    },
    onError: (error) => {
      setStatus({ kind: "error", message: exportErrorMessage(error) });
    }
  });
  const copyMutation = useMutation({
    mutationFn: async () => {
      const exported = await getAiExport(accessToken, { contextId, format });
      await copyToClipboard(exported.content);

      return exported;
    },
    onSuccess: (exported) => {
      setPreview(exported);
      setStatus({ kind: "success", message: `Copied ${labelForFormat(exported.format)} export.` });
    },
    onError: (error) => {
      setStatus({
        kind: "error",
        message:
          error instanceof DOMException
            ? "Could not copy the export. Please try again."
            : exportErrorMessage(error)
      });
    }
  });
  const downloadMutation = useMutation({
    mutationFn: async () => {
      const exported = await downloadAiExport(accessToken, { contextId, format });
      triggerDownload(exported);

      return exported;
    },
    onSuccess: () => {
      setStatus({ kind: "success", message: "Download started." });
    },
    onError: (error) => {
      setStatus({ kind: "error", message: exportErrorMessage(error) });
    }
  });
  const isBusy = previewMutation.isPending || copyMutation.isPending || downloadMutation.isPending;

  return (
    <section className="rounded-md border bg-card/70" aria-labelledby="ai-export-title">
      <div className="grid gap-5 px-4 py-4 lg:px-5">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">AI Export</Badge>
            <Badge tone="muted">Final pipeline stage</Badge>
          </div>
          <h2 id="ai-export-title" className="flex items-center gap-2 text-lg font-semibold">
            <FileJson2 className="size-5 text-muted-foreground" />
            AI Export
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Package the selected Project Context into an AI-ready output for external development
            workflows.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Export format</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose how this Context is packaged for reuse.
              </p>
            </div>
            <TabsList className="flex w-full flex-wrap justify-start" aria-label="AI export format">
              {FORMAT_OPTIONS.map((option) => (
                <TabTrigger
                  key={option.format}
                  active={format === option.format}
                  disabled={isBusy}
                  aria-label={`Select ${option.label} export format`}
                  onClick={() => {
                    setFormat(option.format);
                    setPreview(null);
                    setStatus({ kind: "idle" });
                  }}
                >
                  {option.label}
                </TabTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              aria-busy={previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? <RotateCw className="animate-spin" /> : <Eye />}
              {previewMutation.isPending ? "Generating" : "Preview export"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isBusy}
              aria-busy={copyMutation.isPending}
              onClick={() => copyMutation.mutate()}
            >
              {copyMutation.isPending ? <RotateCw className="animate-spin" /> : <ClipboardCopy />}
              {copyMutation.isPending ? "Generating" : "Copy export"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              aria-busy={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
            >
              {downloadMutation.isPending ? <RotateCw className="animate-spin" /> : <Download />}
              {downloadMutation.isPending ? "Generating" : "Download export"}
            </Button>
          </div>
        </div>

        <ExportContentsSummary format={format} />

        <div aria-live="polite">
          {status.kind === "success" ? (
            <StatePanel
              className="p-3"
              description={status.message}
              icon={CheckCircle2}
              title="Export ready"
              tone="success"
            />
          ) : null}

          {status.kind === "error" ? (
            <StatePanel
              className="p-3"
              description={status.message}
              title="Export failed"
              tone="error"
            />
          ) : null}
        </div>

        {preview ? <ExportPreview exported={preview} /> : null}
      </div>
    </section>
  );
}

function labelForFormat(format: AiExportFormat): string {
  const option = FORMAT_OPTIONS.find((item) => item.format === format);

  return option?.label ?? format;
}

async function copyToClipboard(content: AiExportResponse["content"]): Promise<void> {
  await navigator.clipboard.writeText(content);
}

function ExportContentsSummary({ format }: { format: AiExportFormat }) {
  return (
    <div className="grid gap-3 rounded-md border bg-surface/60 p-4 sm:grid-cols-3">
      <SummaryItem icon={PackageCheck} label="Source" value="Selected Project Context" />
      <SummaryItem label="Format" value={labelForFormat(format)} />
      <SummaryItem label="Delivery" value="Preview, copy, or download" />
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value
}: {
  icon?: typeof PackageCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

function ExportPreview({ exported }: { exported: AiExportResponse }) {
  return (
    <article
      className="grid gap-3 rounded-md border bg-surface/70 p-4"
      aria-labelledby="ai-export-preview-title"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="ai-export-preview-title" className="text-sm font-medium">
            Export preview
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Backend-generated {labelForFormat(exported.format)} content.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="success">Ready</Badge>
          <Badge tone="muted">{exported.contentType}</Badge>
        </div>
      </header>

      <pre className="max-h-96 overflow-auto rounded-md border bg-background p-4 text-xs leading-6 text-subtle-foreground">
        <code>{exported.content}</code>
      </pre>

      <details className="rounded-md border border-border bg-background/40">
        <summary className="px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Technical provenance
        </summary>
        <dl className="grid gap-2 border-t p-3 text-xs sm:grid-cols-2">
          <PreviewMetadata label="Filename" value={exported.filename} />
          <PreviewMetadata label="Format" value={labelForFormat(exported.format)} />
          <PreviewMetadata label="Export version" value={exported.exportVersion} />
          <PreviewMetadata label="Context version" value={exported.contextVersion} />
          <PreviewMetadata label="Project Context record" value={exported.projectContextId} />
          <PreviewMetadata label="Context provenance" value={exported.contextId} />
        </dl>
      </details>
    </article>
  );
}

function PreviewMetadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-subtle-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}
