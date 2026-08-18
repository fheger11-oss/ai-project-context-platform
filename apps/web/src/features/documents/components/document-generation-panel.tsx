import { FileText, History, RefreshCw, RotateCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DocumentApiRequestError,
  generateDocument,
  getDocument,
  getDocumentHistory,
  regenerateDocument
} from "@/features/documents/api/document-api";
import type { GeneratedDocumentResponse } from "@/features/documents/api/document-api";

const DOCUMENT_TYPE = "PROJECT_OVERVIEW";
const DOCUMENT_FORMAT = "MARKDOWN";
const GENERATOR_VERSION = "document-generator@1";

type DocumentGenerationPanelProps = {
  accessToken: string;
  contextId: string;
};

function documentErrorMessage(error: unknown): string {
  if (error instanceof DocumentApiRequestError) {
    if (error.status === 401) {
      return "Sign in again to use Document Generation.";
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

  return value;
}

export function DocumentGenerationPanel({ accessToken, contextId }: DocumentGenerationPanelProps) {
  const queryClient = useQueryClient();
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
      generateDocument(accessToken, {
        contextId,
        documentType: DOCUMENT_TYPE,
        format: DOCUMENT_FORMAT,
        generatorVersion: GENERATOR_VERSION
      }),
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
    <section className="rounded-md border bg-card/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4 text-muted-foreground" />
            Document Generation
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Immutable generated artifacts for the selected Context.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!canGenerate}
            aria-busy={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? <RotateCw /> : <Sparkles />}
            {isGenerating ? "Generating" : "Generate Project Overview"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!activeDocument || !canRegenerate}
            aria-busy={isRegenerating}
            onClick={handleRegenerate}
          >
            <RefreshCw />
            {isRegenerating ? "Regenerating" : "Regenerate"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {historyQuery.isLoading ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Loading document history.
            </p>
          ) : null}

          {historyQuery.isError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {documentErrorMessage(historyQuery.error)}
            </p>
          ) : null}

          {selectedDocumentQuery.isError ? (
            <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {documentErrorMessage(selectedDocumentQuery.error)}
            </p>
          ) : null}

          {generateMutation.isError ? (
            <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {documentErrorMessage(generateMutation.error)}
            </p>
          ) : null}

          {regenerateMutation.isError ? (
            <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {documentErrorMessage(regenerateMutation.error)}
            </p>
          ) : null}

          {!historyQuery.isLoading && !historyQuery.isError && !activeDocument ? (
            <div className="rounded-md border border-dashed p-5">
              <p className="text-sm font-medium">No documents generated yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate a Project Overview from this Context.
              </p>
            </div>
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

function GeneratedDocumentViewer({ document }: { document: GeneratedDocumentResponse }) {
  return (
    <article className="grid gap-4">
      <div className="grid gap-3 rounded-md border bg-background/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">
              {labelForDocumentType(document.documentType)}
            </h3>
            <p
              className="mt-1 truncate font-mono text-xs text-muted-foreground"
              title={document.id}
            >
              {document.id}
            </p>
          </div>
          <Badge tone="muted">{document.format}</Badge>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <MetadataRow label="Created" value={displayDate(document.createdAt)} />
          <MetadataRow label="Generator" value={document.generatorVersion} />
          <MetadataRow label="Context row" value={document.projectContextId} />
          <MetadataRow label="Context provenance" value={document.contextId} />
        </dl>
      </div>

      <pre className="max-h-[32rem] overflow-auto rounded-md border bg-background p-4 whitespace-pre-wrap text-sm leading-6">
        {document.content}
      </pre>
    </article>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-xs" title={value}>
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
    <aside className="rounded-md border bg-background/70">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <History className="size-4 text-muted-foreground" />
          History
        </h3>
        {isFetching ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <RotateCw className="size-3.5" />
            Refreshing
          </span>
        ) : null}
      </div>

      <div className="grid gap-2 p-3">
        {documents.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No documents generated yet.
          </p>
        ) : null}

        {documents.map((document) => (
          <button
            key={document.id}
            type="button"
            className="grid min-h-20 gap-1 rounded-md border bg-card/70 p-3 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
            aria-pressed={document.id === selectedDocumentId}
            onClick={() => onSelect(document)}
          >
            <span className="font-medium">{displayDate(document.createdAt)}</span>
            <span className="text-xs text-muted-foreground">
              {labelForDocumentType(document.documentType)} - {document.format}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground">
              {document.generatorVersion}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground">{document.id}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
