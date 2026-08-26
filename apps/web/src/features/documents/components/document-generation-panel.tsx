import { CalendarClock, FileText, History, RefreshCw, RotateCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsList, TabTrigger } from "@/components/ui/tabs";
import {
  createGenerateDocumentRequest,
  DocumentApiRequestError,
  generateDocument,
  getDocument,
  getDocumentHistory,
  regenerateDocument
} from "@/features/documents/api/document-api";
import type { GeneratedDocumentResponse } from "@/features/documents/api/document-api";
import type { GenerateDocumentRequest } from "@ai-context/contracts";
import { MarkdownDocumentContent } from "./markdown-document-content";

const DOCUMENT_TYPE_OPTIONS: readonly GenerateDocumentRequest["documentType"][] = [
  "PROJECT_OVERVIEW",
  "TECHNICAL_DOCUMENTATION",
  "ARCHITECTURE_DOCUMENT",
  "MODULE_DOCUMENTATION",
  "README"
];

type DocumentGenerationPanelProps = {
  accessToken: string;
  contextId: string;
  initialDocumentType?: GenerateDocumentRequest["documentType"];
};

function documentErrorMessage(error: unknown): string {
  if (error instanceof DocumentApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to use Documents.";
    }

    if (error.status === 403) {
      return "You do not have access to these documents.";
    }

    if (error.status === 404) {
      return "The selected document or Context is no longer available.";
    }

    return "Document request could not be completed.";
  }

  return "Network problem. Check your connection and try again.";
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function labelForDocumentType(value: GeneratedDocumentResponse["documentType"]): string {
  if (value === "PROJECT_OVERVIEW") {
    return "Project Overview";
  }

  if (value === "TECHNICAL_DOCUMENTATION") {
    return "Technical Documentation";
  }

  if (value === "ARCHITECTURE_DOCUMENT") {
    return "Architecture Documentation";
  }

  if (value === "MODULE_DOCUMENTATION") {
    return "Module Documentation";
  }

  if (value === "README") {
    return "README";
  }

  return value;
}

function documentTypeDescription(value: GenerateDocumentRequest["documentType"]): string {
  if (value === "PROJECT_OVERVIEW") {
    return "A readable project summary generated from structured Context.";
  }

  if (value === "TECHNICAL_DOCUMENTATION") {
    return "Technical documentation generated from the selected Context.";
  }

  if (value === "ARCHITECTURE_DOCUMENT") {
    return "Architecture-oriented documentation generated from Context.";
  }

  if (value === "MODULE_DOCUMENTATION") {
    return "Module-focused documentation generated from project knowledge.";
  }

  if (value === "README") {
    return "README content generated from the selected Context.";
  }

  return "Generated documentation artifact.";
}

export function DocumentGenerationPanel({
  accessToken,
  contextId,
  initialDocumentType = "PROJECT_OVERVIEW"
}: DocumentGenerationPanelProps) {
  const queryClient = useQueryClient();
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<GenerateDocumentRequest["documentType"]>(initialDocumentType);
  const [selectedDocument, setSelectedDocument] = useState<{
    contextId: string;
    documentId: string;
  } | null>(null);
  const historyQueryKey = ["document-history", contextId] as const;
  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: () => getDocumentHistory(accessToken, contextId),
    enabled: Boolean(accessToken && contextId)
  });
  const documents = historyQuery.data?.documents ?? [];
  const selectedDocumentId =
    selectedDocument?.contextId === contextId ? selectedDocument.documentId : null;
  const selectedFromHistory =
    documents.find((document) => document.id === selectedDocumentId) ?? null;
  const selectedDocumentQuery = useQuery({
    queryKey: ["document", selectedDocumentId],
    queryFn: () => getDocument(accessToken, selectedDocumentId ?? ""),
    enabled: Boolean(accessToken && selectedDocumentId)
  });
  const activeDocument = selectedDocumentQuery.data ?? selectedFromHistory ?? documents[0] ?? null;
  const generateMutation = useMutation({
    mutationFn: () =>
      generateDocument(accessToken, createGenerateDocumentRequest(contextId, selectedDocumentType)),
    onSuccess: async (document) => {
      setSelectedDocument({ contextId, documentId: document.id });
      queryClient.setQueryData(["document", document.id], document);
      await queryClient.invalidateQueries({ queryKey: historyQueryKey });
    }
  });
  const regenerateMutation = useMutation({
    mutationFn: (documentId: string) => regenerateDocument(accessToken, documentId),
    onSuccess: async (document) => {
      setSelectedDocument({ contextId, documentId: document.id });
      queryClient.setQueryData(["document", document.id], document);
      await queryClient.invalidateQueries({ queryKey: historyQueryKey });
    }
  });
  const isGenerating = generateMutation.isPending;
  const isRegenerating = regenerateMutation.isPending;
  const selectedDocumentTypeLabel = labelForDocumentType(selectedDocumentType);
  const canGenerate = Boolean(accessToken && contextId && !isGenerating);
  const canRegenerate = Boolean(activeDocument && !isRegenerating);

  function handleGenerate() {
    if (!canGenerate) {
      return;
    }

    generateMutation.mutate();
  }

  function handleRegenerate() {
    if (!activeDocument || !canRegenerate) {
      return;
    }

    regenerateMutation.mutate(activeDocument.id);
  }

  return (
    <section className="rounded-md border bg-card/70" aria-labelledby="document-workspace-title">
      <div className="grid gap-4 border-b px-4 py-4 lg:px-5">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Documents</Badge>
            <Badge tone="muted">Generated from Project Context</Badge>
          </div>
          <h2
            id="document-workspace-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <FileText className="size-5 text-muted-foreground" />
            Document workspace
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Package structured project knowledge into readable Markdown artifacts.
          </p>
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <DocumentTypeSwitcher
            disabled={isGenerating}
            selectedDocumentType={selectedDocumentType}
            onSelect={setSelectedDocumentType}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!canGenerate}
              aria-busy={isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? <RotateCw className="animate-spin" /> : <Sparkles />}
              {isGenerating ? "Generating" : `Generate ${selectedDocumentTypeLabel}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!activeDocument || !canRegenerate}
              aria-busy={isRegenerating}
              onClick={handleRegenerate}
            >
              <RefreshCw className={isRegenerating ? "animate-spin" : undefined} />
              {isRegenerating ? "Regenerating" : "Regenerate document"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:p-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {historyQuery.isLoading ? (
            <StatePanel
              description="Loading generated document artifacts for this Context."
              title="Loading documents"
              tone="loading"
            />
          ) : null}

          {historyQuery.isError ? (
            <StatePanel
              description={documentErrorMessage(historyQuery.error)}
              title="Documents unavailable"
              tone="error"
            />
          ) : null}

          {selectedDocumentQuery.isError ? (
            <StatePanel
              className="mb-3"
              description={documentErrorMessage(selectedDocumentQuery.error)}
              title="Selected document unavailable"
              tone="error"
            />
          ) : null}

          {generateMutation.isError ? (
            <StatePanel
              className="mb-3"
              description={documentErrorMessage(generateMutation.error)}
              title="Document generation failed"
              tone="error"
            />
          ) : null}

          {regenerateMutation.isError ? (
            <StatePanel
              className="mb-3"
              description={documentErrorMessage(regenerateMutation.error)}
              title="Document regeneration failed"
              tone="error"
            />
          ) : null}

          {!historyQuery.isLoading && !historyQuery.isError && !activeDocument ? (
            <StatePanel
              action={
                <Button
                  type="button"
                  size="sm"
                  disabled={!canGenerate}
                  aria-busy={isGenerating}
                  onClick={handleGenerate}
                >
                  {isGenerating ? <RotateCw className="animate-spin" /> : <Sparkles />}
                  Generate {selectedDocumentTypeLabel}
                </Button>
              }
              description="Documents are generated from Project Context and turn structured project knowledge into readable Markdown artifacts."
              title="No documents generated yet"
              tone="empty"
            />
          ) : null}

          {activeDocument ? <GeneratedDocumentViewer document={activeDocument} /> : null}
        </div>

        <DocumentHistory
          documents={documents}
          isFetching={historyQuery.isFetching}
          selectedDocumentId={activeDocument?.id ?? null}
          onSelect={(document) => setSelectedDocument({ contextId, documentId: document.id })}
        />
      </div>
    </section>
  );
}

function DocumentTypeSwitcher({
  disabled,
  onSelect,
  selectedDocumentType
}: {
  disabled: boolean;
  onSelect: (documentType: GenerateDocumentRequest["documentType"]) => void;
  selectedDocumentType: GenerateDocumentRequest["documentType"];
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">Document type</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {documentTypeDescription(selectedDocumentType)}
        </p>
      </div>
      <TabsList
        className="flex w-full flex-wrap justify-start"
        aria-label="Document type to generate"
      >
        {DOCUMENT_TYPE_OPTIONS.map((documentType) => (
          <TabTrigger
            key={documentType}
            active={documentType === selectedDocumentType}
            disabled={disabled}
            aria-label={`Select ${labelForDocumentType(documentType)} document type`}
            onClick={() => onSelect(documentType)}
          >
            {labelForDocumentType(documentType)}
          </TabTrigger>
        ))}
      </TabsList>
    </div>
  );
}

function GeneratedDocumentViewer({ document }: { document: GeneratedDocumentResponse }) {
  return (
    <article className="grid gap-4" aria-labelledby="active-document-title">
      <header className="grid gap-4 rounded-md border bg-surface/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="success">Generated</Badge>
              <Badge tone="muted">{document.format}</Badge>
            </div>
            <h3 id="active-document-title" className="text-xl font-semibold">
              {labelForDocumentType(document.documentType)}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {documentTypeDescription(document.documentType)}
            </p>
          </div>
          <div className="text-left text-xs text-muted-foreground sm:text-right">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              Generated {displayDate(document.createdAt)}
            </span>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <MetadataRow label="Document type" value={labelForDocumentType(document.documentType)} />
          <MetadataRow label="Format" value={document.format} />
          <MetadataRow label="Generator" value={document.generatorVersion} />
        </dl>

        <details className="rounded-md border border-border bg-background/40">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            Technical provenance
          </summary>
          <dl className="grid gap-2 border-t p-3 text-xs sm:grid-cols-2">
            <MetadataRow label="Document ID" value={document.id} />
            <MetadataRow label="Project Context record" value={document.projectContextId} />
            <MetadataRow label="Context provenance" value={document.contextId} />
            <MetadataRow label="Created" value={displayDate(document.createdAt)} />
          </dl>
        </details>
      </header>

      <MarkdownDocumentContent content={document.content} />
    </article>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-subtle-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}

function DocumentHistory({
  documents,
  isFetching,
  onSelect,
  selectedDocumentId
}: {
  documents: readonly GeneratedDocumentResponse[];
  isFetching: boolean;
  onSelect: (document: GeneratedDocumentResponse) => void;
  selectedDocumentId: string | null;
}) {
  return (
    <aside
      className="self-start rounded-md border bg-background/70"
      aria-labelledby="document-history-title"
    >
      <div className="flex items-center justify-between gap-3 border-b px-3 py-3">
        <div>
          <h3 id="document-history-title" className="flex items-center gap-2 text-sm font-medium">
            <History className="size-4 text-muted-foreground" />
            Artifact history
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Generated documents for this Context.
          </p>
        </div>
        {isFetching ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCw className="size-3.5 animate-spin" />
            Refreshing
          </span>
        ) : null}
      </div>

      <div className="grid gap-2 p-3">
        {documents.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No document artifacts yet.
          </p>
        ) : null}

        {documents.map((document) => {
          const isSelected = document.id === selectedDocumentId;

          return (
            <article key={document.id} className="grid gap-2 rounded-md border bg-card/70 p-2">
              <button
                type="button"
                className="grid min-h-24 gap-2 rounded-sm p-2 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none aria-pressed:bg-primary/10"
                aria-pressed={isSelected}
                onClick={() => onSelect(document)}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{labelForDocumentType(document.documentType)}</span>
                  {isSelected ? <Badge tone="success">Current</Badge> : null}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {displayDate(document.createdAt)}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone="muted">{document.format}</Badge>
                  <span className="truncate font-mono">{document.generatorVersion}</span>
                </span>
              </button>
              <details className="rounded-sm border border-border bg-background/40">
                <summary className="cursor-pointer px-2 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  Provenance
                </summary>
                <dl className="grid gap-2 border-t p-2 text-xs">
                  <MetadataRow label="Document ID" value={document.id} />
                  <MetadataRow label="Project Context record" value={document.projectContextId} />
                  <MetadataRow label="Context provenance" value={document.contextId} />
                </dl>
              </details>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
