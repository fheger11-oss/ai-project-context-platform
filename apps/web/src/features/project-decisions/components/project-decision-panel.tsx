import {
  Archive,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  X
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateProjectDecisionRequest,
  ProjectDecision,
  ProjectDecisionStatus,
  UpdateProjectDecisionRequest
} from "@ai-context/contracts";

import { ErrorNotice } from "@/components/shared/error-notice";
import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabPanel, TabsList, TabTrigger } from "@/components/ui/tabs";
import {
  ApiRequestError,
  createProjectDecision,
  getProjectDecision,
  listProjectDecisions,
  updateProjectDecision
} from "@/features/project-decisions/api/project-decisions-api";
import { ProjectDecisionFormDialog } from "@/features/project-decisions/components/project-decision-form-dialog";
import { userFacingError, type UserFacingError } from "@/lib/api-error";

const PAGE_SIZE = 10;
const statuses: { label: string; value: ProjectDecisionStatus }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Superseded", value: "SUPERSEDED" },
  { label: "Archived", value: "ARCHIVED" }
];

// Exported for focused conflict-contract coverage; this remains feature-local UI behavior.
// eslint-disable-next-line react-refresh/only-export-components
export const projectDecisionConflictMessage: UserFacingError = {
  title: "Decision changed",
  message:
    "This decision changed while your update was being applied. The latest state has been reloaded. Review it before trying again."
};

// Exported for repository-isolation tests, not as a cross-feature query-key framework.
// eslint-disable-next-line react-refresh/only-export-components
export function projectDecisionListQueryKey(
  repositoryId: string,
  status: ProjectDecisionStatus | "ALL",
  page: number,
  pageSize: number
) {
  return ["repositories", repositoryId, "decisions", "list", status, page, pageSize] as const;
}

type ProjectDecisionPanelProps = {
  accessToken: string;
  repositoryId: string;
};

type FormState = { mode: "create" } | { decision: ProjectDecision; mode: "edit" };
type ConfirmationState = {
  decision: ProjectDecision;
  targetStatus: "ARCHIVED" | "SUPERSEDED";
};
type UpdateVariables = {
  decisionId: string;
  input: UpdateProjectDecisionRequest;
};

export function ProjectDecisionPanel({ accessToken, repositoryId }: ProjectDecisionPanelProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProjectDecisionStatus>("ACTIVE");
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [conflict, setConflict] = useState<UserFacingError | null>(null);
  const selectedDecisionId = formState?.mode === "edit" ? formState.decision.id : null;
  const decisionRootKey = ["repositories", repositoryId, "decisions"] as const;
  const listQuery = useQuery({
    queryKey: projectDecisionListQueryKey(repositoryId, status, page, PAGE_SIZE),
    queryFn: () =>
      listProjectDecisions(accessToken, repositoryId, { page, pageSize: PAGE_SIZE, status }),
    enabled: Boolean(accessToken && repositoryId)
  });
  const detailQuery = useQuery({
    queryKey: ["repositories", repositoryId, "decisions", "detail", selectedDecisionId],
    queryFn: () => getProjectDecision(accessToken, repositoryId, selectedDecisionId ?? ""),
    enabled: Boolean(accessToken && repositoryId && selectedDecisionId),
    initialData:
      formState?.mode === "edit" && formState.decision.id === selectedDecisionId
        ? formState.decision
        : undefined,
    initialDataUpdatedAt: 0
  });
  const createMutation = useMutation({
    mutationFn: (input: CreateProjectDecisionRequest) =>
      createProjectDecision(accessToken, repositoryId, input),
    onSuccess: async () => {
      setFormState(null);
      await queryClient.invalidateQueries({ queryKey: decisionRootKey });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ decisionId, input }: UpdateVariables) =>
      updateProjectDecision(accessToken, repositoryId, decisionId, input),
    onSuccess: async (decision) => {
      queryClient.setQueryData(
        ["repositories", repositoryId, "decisions", "detail", decision.id],
        decision
      );
      setFormState(null);
      setConfirmation(null);
      setConflict(null);
      await queryClient.invalidateQueries({ queryKey: decisionRootKey });
    },
    onError: async (error, variables) => {
      if (!(error instanceof ApiRequestError) || error.status !== 409) return;

      setConflict(projectDecisionConflictMessage);
      await queryClient.invalidateQueries({ queryKey: decisionRootKey });
      await queryClient.refetchQueries({
        queryKey: ["repositories", repositoryId, "decisions", "detail", variables.decisionId],
        exact: true
      });
      setFormState(null);
      setConfirmation(null);
    }
  });

  const decisions = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;
  const formDecision = formState?.mode === "edit" ? (detailQuery.data ?? formState.decision) : null;
  const mutationError = updateMutation.error
    ? userFacingError(updateMutation.error)
    : createMutation.error
      ? userFacingError(createMutation.error)
      : null;

  function openCreate() {
    createMutation.reset();
    updateMutation.reset();
    setConflict(null);
    setFormState({ mode: "create" });
  }

  function openEdit(decision: ProjectDecision) {
    createMutation.reset();
    updateMutation.reset();
    setConflict(null);
    setFormState({ decision, mode: "edit" });
  }

  function changeStatus(nextStatus: ProjectDecisionStatus) {
    setStatus(nextStatus);
    setPage(1);
    setConflict(null);
  }

  function updateLifecycle(decision: ProjectDecision, nextStatus: ProjectDecisionStatus) {
    updateMutation.reset();
    setConflict(null);
    updateMutation.mutate({ decisionId: decision.id, input: { status: nextStatus } });
  }

  return (
    <section className="grid gap-5" aria-labelledby="project-decisions-title">
      <PageHeading
        eyebrow="Project knowledge"
        title={<span id="project-decisions-title">Decisions</span>}
        description="Record important technical and product decisions for this repository."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Record decision
          </Button>
        }
      />

      {conflict ? <ErrorNotice error={conflict} /> : null}
      {updateMutation.isError && !conflict && !formState && !confirmation ? (
        <ErrorNotice error={userFacingError(updateMutation.error)} />
      ) : null}

      <div className="grid gap-4">
        <TabsList aria-label="Decision status">
          {statuses.map((item) => (
            <TabTrigger
              key={item.value}
              active={status === item.value}
              onClick={() => changeStatus(item.value)}
            >
              {item.label}
            </TabTrigger>
          ))}
        </TabsList>

        <TabPanel aria-label={`${statusLabel(status)} decisions`} className="grid gap-3">
          {listQuery.isLoading ? (
            <StatePanel
              description={`Loading ${statusLabel(status).toLowerCase()} decisions for this repository.`}
              title="Loading decisions"
              tone="loading"
            />
          ) : null}

          {listQuery.isError ? (
            <StatePanel
              action={
                <Button
                  type="button"
                  variant="outline"
                  disabled={listQuery.isFetching}
                  onClick={() => void listQuery.refetch()}
                >
                  <RefreshCw className={listQuery.isFetching ? "animate-spin" : undefined} />
                  Retry
                </Button>
              }
              description="Decisions could not be loaded for this repository."
              title="Decisions unavailable"
              tone="error"
            />
          ) : null}

          {!listQuery.isLoading && !listQuery.isError && decisions.length === 0 ? (
            <StatePanel
              action={
                status === "ACTIVE" ? (
                  <Button type="button" size="sm" onClick={openCreate}>
                    <Plus />
                    Record the first decision
                  </Button>
                ) : undefined
              }
              description={emptyDescription(status)}
              title={`No ${statusLabel(status).toLowerCase()} decisions`}
              tone="empty"
            />
          ) : null}

          {!listQuery.isLoading && !listQuery.isError
            ? decisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  isUpdating={
                    updateMutation.isPending && updateMutation.variables?.decisionId === decision.id
                  }
                  onEdit={() => openEdit(decision)}
                  onRequestLifecycle={(targetStatus) => {
                    updateMutation.reset();
                    setConflict(null);
                    setConfirmation({ decision, targetStatus });
                  }}
                  onRestore={() => updateLifecycle(decision, "ACTIVE")}
                />
              ))
            : null}

          {pagination && pagination.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} · {pagination.total} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1 || listQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!pagination.hasNextPage || listQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          ) : null}
        </TabPanel>
      </div>

      {formState ? (
        <ProjectDecisionFormDialog
          decision={formDecision}
          error={mutationError}
          isPending={createMutation.isPending || updateMutation.isPending}
          open
          onClose={() => {
            if (createMutation.isPending || updateMutation.isPending) return;
            setFormState(null);
          }}
          onSubmit={(input) => {
            if (formState.mode === "create") {
              createMutation.mutate(input);
            } else {
              updateMutation.mutate({ decisionId: formState.decision.id, input });
            }
          }}
        />
      ) : null}

      <LifecycleConfirmationDialog
        confirmation={confirmation}
        error={confirmation && updateMutation.error ? userFacingError(updateMutation.error) : null}
        isPending={updateMutation.isPending}
        onCancel={() => {
          if (!updateMutation.isPending) setConfirmation(null);
        }}
        onConfirm={() => {
          if (!confirmation) return;
          updateLifecycle(confirmation.decision, confirmation.targetStatus);
        }}
      />
    </section>
  );
}

function DecisionCard({
  decision,
  isUpdating,
  onEdit,
  onRequestLifecycle,
  onRestore
}: {
  decision: ProjectDecision;
  isUpdating: boolean;
  onEdit: () => void;
  onRequestLifecycle: (status: "ARCHIVED" | "SUPERSEDED") => void;
  onRestore: () => void;
}) {
  const hasProvenance = Boolean(
    decision.sourceProjectContextId || decision.sourceRepositoryUpdateId || decision.sourceCommitSha
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{decision.title}</CardTitle>
            <Badge tone={statusTone(decision.status)}>{statusLabel(decision.status)}</Badge>
          </div>
          <CardDescription className="mt-1">Affected area: {decision.affectedArea}</CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={isUpdating} onClick={onEdit}>
          <Pencil />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <DecisionText label="Decision" value={decision.decision} />
          <DecisionText label="Rationale" value={decision.rationale} />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            Decided {displayDate(decision.decidedAt)}
          </span>
          <span>Updated {displayDate(decision.updatedAt)}</span>
        </div>

        {hasProvenance ? <DecisionProvenance decision={decision} /> : null}

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {decision.status === "ACTIVE" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isUpdating}
                onClick={() => onRequestLifecycle("ARCHIVED")}
              >
                <Archive />
                Archive
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isUpdating}
                onClick={() => onRequestLifecycle("SUPERSEDED")}
              >
                Supersede
              </Button>
            </>
          ) : null}
          {decision.status === "ARCHIVED" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={onRestore}
            >
              {isUpdating ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              {isUpdating ? "Restoring" : "Restore to Active"}
            </Button>
          ) : null}
          {isUpdating && decision.status === "ACTIVE" ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Updating decision
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/60 p-4">
      <h3 className="text-xs font-medium uppercase text-muted-foreground">{label}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function DecisionProvenance({ decision }: { decision: ProjectDecision }) {
  return (
    <details className="rounded-md border border-border bg-background/35">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        Source provenance
      </summary>
      <dl className="grid gap-3 border-t p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {decision.sourceProjectContextId ? (
          <ProvenanceRow label="Project Context" value={decision.sourceProjectContextId} />
        ) : null}
        {decision.sourceRepositoryUpdateId ? (
          <ProvenanceRow label="Repository Update" value={decision.sourceRepositoryUpdateId} />
        ) : null}
        {decision.sourceCommitSha ? (
          <ProvenanceRow
            label="Commit"
            value={shortCommit(decision.sourceCommitSha)}
            title={decision.sourceCommitSha}
          />
        ) : null}
      </dl>
    </details>
  );
}

function ProvenanceRow({ label, title, value }: { label: string; title?: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-subtle-foreground" title={title ?? value}>
        {value}
      </dd>
    </div>
  );
}

function LifecycleConfirmationDialog({
  confirmation,
  error,
  isPending,
  onCancel,
  onConfirm
}: {
  confirmation: ConfirmationState | null;
  error: UserFacingError | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!confirmation) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmation, isPending, onCancel]);

  if (!confirmation) return null;

  const isSuperseding = confirmation.targetStatus === "SUPERSEDED";

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-background/72 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-md border border-border bg-surface p-4 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-5"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">
              {isSuperseding ? "Supersede this decision?" : "Archive this decision?"}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">
              {isSuperseding
                ? "Superseded decisions remain in history and cannot return to Active. Record a new decision separately when the project adopts a materially different choice."
                : "Archived decisions remain in history and can be restored to Active later."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            disabled={isPending}
            onClick={onCancel}
          >
            <X />
          </Button>
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorNotice error={error} />
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            variant={isSuperseding ? "destructive" : "default"}
            aria-busy={isPending}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {isPending
              ? isSuperseding
                ? "Superseding"
                : "Archiving"
              : isSuperseding
                ? "Supersede decision"
                : "Archive decision"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function statusLabel(status: ProjectDecisionStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function statusTone(status: ProjectDecisionStatus): "muted" | "neutral" | "success" {
  if (status === "ACTIVE") return "success";
  if (status === "SUPERSEDED") return "neutral";
  return "muted";
}

function emptyDescription(status: ProjectDecisionStatus): string {
  if (status === "ACTIVE") {
    return "Record the first explicit technical, product, or architectural choice for this repository.";
  }
  if (status === "SUPERSEDED") {
    return "No decisions in this repository have been superseded.";
  }
  return "No decisions in this repository have been archived.";
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function shortCommit(value: string): string {
  return value.length > 12 ? value.slice(0, 12) : value;
}
