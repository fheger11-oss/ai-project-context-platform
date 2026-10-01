import { Archive, Pencil, Plus, RefreshCw, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectKnowledge,
  ProjectKnowledgeStatus,
  UpdateProjectKnowledgeRequest
} from "@ai-context/contracts";
import { ErrorNotice } from "@/components/shared/error-notice";
import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TabPanel, TabsList, TabTrigger } from "@/components/ui/tabs";
import {
  createProjectKnowledge,
  listProjectKnowledge,
  updateProjectKnowledge
} from "@/features/project-knowledge/api/project-knowledge-api";
import { ProjectKnowledgeFormDialog } from "@/features/project-knowledge/components/project-knowledge-form-dialog";
import { ApiRequestError, userFacingError } from "@/lib/api-error";

const PAGE_SIZE = 10;
const statuses: ProjectKnowledgeStatus[] = ["ACTIVE", "SUPERSEDED", "ARCHIVED"];
// Exported for focused repository-isolation coverage.
// eslint-disable-next-line react-refresh/only-export-components
export const projectKnowledgeListQueryKey = (
  repositoryId: string,
  status: ProjectKnowledgeStatus,
  page: number
) => ["repositories", repositoryId, "knowledge", "list", status, page, PAGE_SIZE] as const;

export function ProjectKnowledgePanel({
  accessToken,
  repositoryId
}: {
  accessToken: string;
  repositoryId: string;
}) {
  const client = useQueryClient();
  const [status, setStatus] = useState<ProjectKnowledgeStatus>("ACTIVE");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ProjectKnowledge | "create" | null>(null);
  const [conflict, setConflict] = useState(false);
  const root = ["repositories", repositoryId, "knowledge"] as const;
  const query = useQuery({
    queryKey: projectKnowledgeListQueryKey(repositoryId, status, page),
    queryFn: () =>
      listProjectKnowledge(accessToken, repositoryId, { page, pageSize: PAGE_SIZE, status }),
    enabled: Boolean(accessToken && repositoryId)
  });
  const create = useMutation({
    mutationFn: (content: string) => createProjectKnowledge(accessToken, repositoryId, { content }),
    onSuccess: async () => {
      setEditing(null);
      await client.invalidateQueries({ queryKey: root });
    }
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectKnowledgeRequest }) =>
      updateProjectKnowledge(accessToken, repositoryId, id, input),
    onSuccess: async () => {
      setEditing(null);
      setConflict(false);
      await client.invalidateQueries({ queryKey: root });
    },
    onError: async (error) => {
      if (error instanceof ApiRequestError && error.status === 409) {
        setEditing(null);
        setConflict(true);
        await client.invalidateQueries({ queryKey: root });
      }
    }
  });
  const items = query.data?.items ?? [];
  return (
    <section className="grid gap-5" aria-labelledby="project-knowledge-title">
      <PageHeading
        eyebrow="Project knowledge"
        title={<span id="project-knowledge-title">Knowledge</span>}
        description="Retain durable, explicit facts about this repository."
        actions={
          <Button onClick={() => setEditing("create")}>
            <Plus />
            Add knowledge
          </Button>
        }
      />
      {conflict ? (
        <ErrorNotice
          error={{
            title: "Knowledge changed",
            message:
              "This knowledge changed while your update was being applied. The latest state has been reloaded."
          }}
        />
      ) : null}
      <TabsList aria-label="Knowledge status">
        {statuses.map((value) => (
          <TabTrigger
            key={value}
            active={status === value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
          >
            {value[0] + value.slice(1).toLowerCase()}
          </TabTrigger>
        ))}
      </TabsList>
      <TabPanel aria-label={`${status} knowledge`} className="grid gap-3">
        {query.isLoading ? (
          <StatePanel
            title="Loading knowledge"
            description="Loading project knowledge for this repository."
            tone="loading"
          />
        ) : null}
        {query.isError ? (
          <StatePanel
            title="Knowledge unavailable"
            description="Project knowledge could not be loaded."
            tone="error"
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                <RefreshCw />
                Retry
              </Button>
            }
          />
        ) : null}
        {!query.isLoading && !query.isError && items.length === 0 ? (
          <StatePanel
            title="No project knowledge"
            description={`No ${status.toLowerCase()} knowledge exists for this repository.`}
            tone="empty"
          />
        ) : null}
        {items.map((item) => (
          <KnowledgeCard
            key={item.id}
            item={item}
            pending={update.isPending}
            onEdit={() => setEditing(item)}
            onStatus={(next) => update.mutate({ id: item.id, input: { status: next } })}
          />
        ))}
        {query.data && query.data.pagination.total > PAGE_SIZE ? (
          <div className="flex items-center justify-between">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              disabled={!query.data.pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </TabPanel>
      <ProjectKnowledgeFormDialog
        key={editing === "create" ? "create" : (editing?.id ?? "closed")}
        open={editing !== null}
        item={editing === "create" ? null : editing}
        isPending={create.isPending || update.isPending}
        error={
          create.error
            ? userFacingError(create.error)
            : update.error && !conflict
              ? userFacingError(update.error)
              : null
        }
        onClose={() => setEditing(null)}
        onSubmit={(content) => {
          if (editing && editing !== "create")
            update.mutate({ id: editing.id, input: { content } });
          else create.mutate(content);
        }}
      />
    </section>
  );
}

function KnowledgeCard({
  item,
  pending,
  onEdit,
  onStatus
}: {
  item: ProjectKnowledge;
  pending: boolean;
  onEdit: () => void;
  onStatus: (status: ProjectKnowledgeStatus) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone={item.status === "ACTIVE" ? "success" : "muted"}>{item.status}</Badge>
          <Badge tone="neutral">
            {item.origin === "USER_AUTHORED"
              ? "User-authored"
              : item.kind === "OBSERVED"
                ? "Observed"
                : "Inferred"}
          </Badge>
          {item.confidence ? <Badge tone="neutral">{item.confidence}</Badge> : null}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          disabled={pending || item.status === "SUPERSEDED"}
        >
          <Pencil />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="whitespace-pre-wrap text-sm leading-6">{item.content}</p>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(item.updatedAt).toLocaleString()}
        </p>
        {item.sourceType !== "USER" ? (
          <details className="text-xs text-muted-foreground">
            <summary>Source provenance</summary>
            <div className="mt-2 grid gap-1 font-mono">
              <span>{item.sourceType}</span>
              {item.sourceProjectContextId ? (
                <span>Context: {item.sourceProjectContextId}</span>
              ) : null}
              {item.sourceProjectDecisionId ? (
                <span>Decision: {item.sourceProjectDecisionId}</span>
              ) : null}
            </div>
          </details>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {item.status === "ACTIVE" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => onStatus("ARCHIVED")}
              >
                <Archive />
                Archive
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => onStatus("SUPERSEDED")}
              >
                <X />
                Supersede
              </Button>
            </>
          ) : null}
          {item.status === "ARCHIVED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => onStatus("ACTIVE")}
            >
              <RotateCcw />
              Restore
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
