import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  ArchitectureComparisonResponse,
  ArchitectureModule,
  ArchitectureRelationship,
  ArchitectureSnapshotSummary,
  ModifiedArchitectureModule,
  SuppressedArchitectureClaim
} from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getArchitectureComparison,
  listArchitectureHistory
} from "@/features/architecture-history/api/architecture-history-api";

// Exported for focused repository-isolation tests, not as a global key framework.
// eslint-disable-next-line react-refresh/only-export-components
export function architectureHistoryQueryKey(repositoryId: string) {
  return ["repositories", repositoryId, "architecture-history"] as const;
}

// eslint-disable-next-line react-refresh/only-export-components
export function architectureComparisonQueryKey(repositoryId: string, historyId: string) {
  return ["repositories", repositoryId, "architecture-history", historyId, "comparison"] as const;
}

export function ArchitectureHistoryPanel({
  accessToken,
  repositoryId
}: {
  accessToken: string;
  repositoryId: string;
}) {
  const [selection, setSelection] = useState({ repositoryId, historyId: "" });
  const historyQuery = useQuery({
    queryKey: architectureHistoryQueryKey(repositoryId),
    queryFn: () => listArchitectureHistory(accessToken, repositoryId),
    enabled: Boolean(accessToken && repositoryId)
  });
  const snapshots = historyQuery.data?.items ?? [];
  const requestedHistoryId = selection.repositoryId === repositoryId ? selection.historyId : "";
  const selected =
    snapshots.find((snapshot) => snapshot.historyId === requestedHistoryId) ?? snapshots[0] ?? null;
  const comparisonQuery = useQuery({
    queryKey: architectureComparisonQueryKey(repositoryId, selected?.historyId ?? "none"),
    queryFn: () => getArchitectureComparison(accessToken, repositoryId, selected?.historyId ?? ""),
    enabled: Boolean(accessToken && repositoryId && selected?.hasPreviousSnapshot)
  });

  return (
    <section className="grid gap-5" aria-labelledby="architecture-history-title">
      <PageHeading
        eyebrow="Project evolution"
        title={<span id="architecture-history-title">Architecture History</span>}
        description="Compare structural architecture between durable promoted project contexts."
      />

      {historyQuery.isLoading ? (
        <StatePanel
          description="Loading durable architecture snapshots."
          title="Loading architecture history"
          tone="loading"
        />
      ) : null}

      {historyQuery.isError ? (
        <RequestError
          description="Architecture history could not be loaded for this repository."
          isFetching={historyQuery.isFetching}
          onRetry={() => void historyQuery.refetch()}
          title="Architecture history unavailable"
        />
      ) : null}

      {!historyQuery.isLoading && !historyQuery.isError && snapshots.length === 0 ? (
        <StatePanel
          description="Architecture History becomes available after Ctxaro records promoted project contexts."
          title="No architecture history available"
          tone="empty"
        />
      ) : null}

      {!historyQuery.isLoading && !historyQuery.isError && selected ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select target snapshot</CardTitle>
              <p className="text-sm text-muted-foreground">
                The server compares the selected target with its immediately preceding durable
                snapshot.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="architecture-history-target">Target snapshot</Label>
                <Select
                  id="architecture-history-target"
                  value={selected.historyId}
                  onChange={(event) =>
                    setSelection({ repositoryId, historyId: event.currentTarget.value })
                  }
                >
                  {snapshots.map((snapshot) => (
                    <option key={snapshot.historyId} value={snapshot.historyId}>
                      {abbreviateSha(snapshot.commitSha)} · promoted{" "}
                      {formatDate(snapshot.promotedAt)}
                    </option>
                  ))}
                </Select>
              </div>
              <SnapshotMetadata label="Selected target" snapshot={selected} />
            </CardContent>
          </Card>

          {!selected.hasPreviousSnapshot ? (
            <NoBaselineState snapshot={selected} />
          ) : comparisonQuery.isLoading || comparisonQuery.isFetching ? (
            <StatePanel
              description="Comparing the selected target with its adjacent durable baseline."
              title="Loading architecture comparison"
              tone="loading"
            />
          ) : comparisonQuery.isError ? (
            <RequestError
              description="The selected architecture snapshots could not be compared."
              isFetching={comparisonQuery.isFetching}
              onRetry={() => void comparisonQuery.refetch()}
              title="Architecture comparison unavailable"
            />
          ) : comparisonQuery.data ? (
            <ComparisonResult comparison={comparisonQuery.data} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function ComparisonResult({ comparison }: { comparison: ArchitectureComparisonResponse }) {
  if (comparison.status === "NO_BASELINE") {
    return <NoBaselineState snapshot={comparison.target} />;
  }

  if (comparison.status === "INCOMPATIBLE") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Snapshots are not compatible</CardTitle>
            <Badge tone="warning">Compatibility safeguard</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Structural changes are intentionally unavailable because persisted context or analyzer
            versions differ.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <SnapshotMetadata label="Baseline" snapshot={comparison.baseline} />
          <SnapshotMetadata label="Target" snapshot={comparison.target} />
        </CardContent>
      </Card>
    );
  }

  if (comparison.status === "INCOMPLETE") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Architecture history could not be compared safely</CardTitle>
            <Badge tone="warning">Incomplete</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            No authoritative structural diff is shown. Ctxaro did not repair or reinterpret the
            persisted snapshot.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          {comparison.diagnostics.length > 0 ? (
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {comparison.diagnostics.map((diagnostic, index) => (
                <li key={`${diagnostic.code}:${index}`}>
                  <span className="font-medium text-foreground">{diagnostic.code}:</span>{" "}
                  {diagnostic.message}
                </li>
              ))}
            </ul>
          ) : null}
          <SuppressedClaims claims={comparison.suppressedClaims} />
        </CardContent>
      </Card>
    );
  }

  const hasStructuralChanges =
    comparison.addedModules.length > 0 ||
    comparison.removedModules.length > 0 ||
    comparison.modifiedModules.length > 0 ||
    comparison.addedRelationships.length > 0 ||
    comparison.removedRelationships.length > 0;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <SnapshotMetadata label="Baseline" snapshot={comparison.baseline} />
        <SnapshotMetadata label="Target" snapshot={comparison.target} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Structural comparison</CardTitle>
            <Badge tone="neutral">Inferred</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Modules are modified only when their incoming or outgoing relationship identities
            change.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCount label="Unchanged modules" value={comparison.unchangedModuleCount} />
            <SummaryCount
              label="Unchanged relationships"
              value={comparison.unchangedRelationshipCount}
            />
          </div>
          {!hasStructuralChanges ? (
            <StatePanel
              description="The repository may still contain other non-structural changes."
              title="No structural architecture changes detected"
              tone="empty"
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <ModuleSection title="Added modules" modules={comparison.addedModules} tone="added" />
              <ModuleSection
                title="Removed modules"
                modules={comparison.removedModules}
                tone="removed"
              />
              <ModifiedModules modules={comparison.modifiedModules} />
              <RelationshipSection
                title="Added relationships"
                relationships={comparison.addedRelationships}
                tone="added"
              />
              <RelationshipSection
                title="Removed relationships"
                relationships={comparison.removedRelationships}
                tone="removed"
              />
            </div>
          )}
          <SuppressedClaims claims={comparison.suppressedClaims} />
        </CardContent>
      </Card>
    </div>
  );
}

function SnapshotMetadata({
  label,
  snapshot
}: {
  label: string;
  snapshot: ArchitectureSnapshotSummary;
}) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-4" aria-label={label}>
      <h3 className="font-medium text-foreground">{label}</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Metadata
          label="Commit"
          value={abbreviateSha(snapshot.commitSha)}
          title={snapshot.commitSha}
          mono
        />
        <Metadata label="Promoted" value={formatDate(snapshot.promotedAt)} />
        <Metadata label="Generated" value={formatDate(snapshot.generatedAt)} />
        <Metadata label="Context version" value={snapshot.contextVersion} mono />
        <Metadata label="Analyzer version" value={snapshot.analyzerVersion} mono />
      </dl>
    </section>
  );
}

function NoBaselineState({ snapshot }: { snapshot: ArchitectureSnapshotSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No previous durable snapshot</CardTitle>
        <p className="text-sm text-muted-foreground">
          This is the earliest available durable architecture snapshot. There is no previous
          promoted snapshot to compare against.
        </p>
      </CardHeader>
      <CardContent>
        <SnapshotMetadata label="Earliest snapshot" snapshot={snapshot} />
      </CardContent>
    </Card>
  );
}

function ModuleSection({
  modules,
  title,
  tone
}: {
  modules: ArchitectureModule[];
  title: string;
  tone: "added" | "removed";
}) {
  return (
    <ChangeSection title={title} count={modules.length}>
      {modules.map((module) => (
        <ModuleIdentity
          key={module.moduleId}
          module={module}
          marker={tone === "added" ? "+" : "−"}
        />
      ))}
    </ChangeSection>
  );
}

function ModifiedModules({ modules }: { modules: ModifiedArchitectureModule[] }) {
  return (
    <ChangeSection title="Modified modules" count={modules.length}>
      {modules.map((modified) => (
        <div key={modified.module.moduleId} className="rounded-md border border-border p-3">
          <ModuleIdentity module={modified.module} marker="~" />
          <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
            <RelationshipChanges
              label="Incoming"
              added={modified.addedIncomingRelationships}
              removed={modified.removedIncomingRelationships}
            />
            <RelationshipChanges
              label="Outgoing"
              added={modified.addedOutgoingRelationships}
              removed={modified.removedOutgoingRelationships}
            />
          </div>
        </div>
      ))}
    </ChangeSection>
  );
}

function RelationshipSection({
  relationships,
  title,
  tone
}: {
  relationships: ArchitectureRelationship[];
  title: string;
  tone: "added" | "removed";
}) {
  return (
    <ChangeSection title={title} count={relationships.length}>
      {relationships.map((relationship) => (
        <p
          key={`${relationship.sourceModuleId}\u0000${relationship.targetModuleId}`}
          className="break-all font-mono text-xs text-foreground"
        >
          <span className={tone === "added" ? "text-success" : "text-error"}>
            {tone === "added" ? "+" : "−"}
          </span>{" "}
          {modulePath(relationship.sourceModuleId)} → {modulePath(relationship.targetModuleId)}{" "}
          <span className="font-sans text-muted-foreground">
            ({relationship.confidence}, inferred)
          </span>
        </p>
      ))}
    </ChangeSection>
  );
}

function ChangeSection({
  children,
  count,
  title
}: {
  children: React.ReactNode;
  count: number;
  title: string;
}) {
  return (
    <section className="grid content-start gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">{title}</h3>
        <Badge tone="muted">{count}</Badge>
      </div>
      {count === 0 ? <p className="text-sm text-muted-foreground">None</p> : children}
    </section>
  );
}

function ModuleIdentity({ module, marker }: { module: ArchitectureModule; marker: string }) {
  return (
    <div className="grid gap-1">
      <p className="font-medium text-foreground">
        <span aria-hidden="true">{marker} </span>
        {module.name}
      </p>
      <p className="break-all font-mono text-xs text-muted-foreground">{module.path}</p>
      <p className="text-xs text-muted-foreground">{module.confidence} confidence · Inferred</p>
    </div>
  );
}

function RelationshipChanges({
  added,
  label,
  removed
}: {
  added: ArchitectureRelationship[];
  label: string;
  removed: ArchitectureRelationship[];
}) {
  return (
    <div className="grid gap-1">
      <p className="font-medium text-foreground">{label}</p>
      {added.map((relationship) => (
        <p
          key={`added:${relationship.sourceModuleId}:${relationship.targetModuleId}`}
          className="font-mono text-success"
        >
          + {modulePath(relationship.sourceModuleId)} → {modulePath(relationship.targetModuleId)}
        </p>
      ))}
      {removed.map((relationship) => (
        <p
          key={`removed:${relationship.sourceModuleId}:${relationship.targetModuleId}`}
          className="font-mono text-error"
        >
          − {modulePath(relationship.sourceModuleId)} → {modulePath(relationship.targetModuleId)}
        </p>
      ))}
      {added.length === 0 && removed.length === 0 ? (
        <p className="text-muted-foreground">Unchanged</p>
      ) : null}
    </div>
  );
}

function SuppressedClaims({ claims }: { claims: SuppressedArchitectureClaim[] }) {
  if (claims.length === 0) return null;

  return (
    <details className="rounded-md border border-border p-3 text-sm">
      <summary className="cursor-pointer font-medium text-foreground">
        Suppressed claims ({claims.length})
      </summary>
      <p className="mt-2 text-muted-foreground">
        These low-confidence inferred claims were excluded from authoritative structural changes.
      </p>
      <ul className="mt-2 grid gap-1 font-mono text-xs text-muted-foreground">
        {claims.map((claim) => (
          <li key={`${claim.identity}:${claim.reason}`}>{claim.identity}</li>
        ))}
      </ul>
    </details>
  );
}

function SummaryCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Metadata({
  label,
  mono = false,
  title,
  value
}: {
  label: string;
  mono?: boolean;
  title?: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-1 break-all font-mono text-xs" : "mt-1"} title={title}>
        {value}
      </dd>
    </div>
  );
}

function RequestError({
  description,
  isFetching,
  onRetry,
  title
}: {
  description: string;
  isFetching: boolean;
  onRetry: () => void;
  title: string;
}) {
  return (
    <StatePanel
      action={
        <Button type="button" variant="outline" disabled={isFetching} onClick={onRetry}>
          <RefreshCw className={isFetching ? "animate-spin" : undefined} />
          Retry
        </Button>
      }
      description={description}
      title={title}
      tone="error"
    />
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function abbreviateSha(value: string): string {
  return value.slice(0, 7);
}

function modulePath(moduleId: string): string {
  return moduleId.startsWith("module:") ? moduleId.slice("module:".length) : moduleId;
}
