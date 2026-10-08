import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type {
  ArchitectureFindingItem,
  ArchitectureFindingLifecycle,
  ArchitectureIntelligenceHistoryItem,
  ArchitectureIntelligenceResponse,
  ArchitectureIntelligenceConfidence
} from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getArchitectureIntelligence,
  getArchitectureIntelligenceHistory
} from "@/features/architecture-intelligence/api/architecture-intelligence-api";

const PAGE_SIZE = 20;

// Exported for focused repository-isolation tests.
// eslint-disable-next-line react-refresh/only-export-components
export function architectureIntelligenceQueryKey(repositoryId: string, state: object) {
  return ["repositories", repositoryId, "architecture-intelligence", state] as const;
}

export function ArchitectureIntelligencePanel({
  accessToken,
  repositoryId
}: {
  accessToken: string;
  repositoryId: string;
}) {
  const [state, setState] = useState({
    repositoryId,
    page: 1,
    modulePage: 1,
    historyPage: 1,
    ruleId: "",
    confidence: "" as "" | ArchitectureIntelligenceConfidence,
    lifecycle: "" as "" | ArchitectureFindingLifecycle
  });
  const current =
    state.repositoryId === repositoryId
      ? state
      : { ...state, repositoryId, page: 1, modulePage: 1, historyPage: 1 };
  const query = useQuery({
    queryKey: architectureIntelligenceQueryKey(repositoryId, current),
    queryFn: () =>
      getArchitectureIntelligence(accessToken, repositoryId, {
        page: current.page,
        pageSize: PAGE_SIZE,
        modulePage: current.modulePage,
        modulePageSize: PAGE_SIZE,
        ...(current.ruleId ? { ruleId: current.ruleId } : {}),
        ...(current.confidence ? { confidence: current.confidence } : {}),
        ...(current.lifecycle ? { lifecycle: current.lifecycle } : {})
      }),
    enabled: Boolean(accessToken && repositoryId)
  });
  const history = useQuery({
    queryKey: [
      "repositories",
      repositoryId,
      "architecture-intelligence",
      "history",
      current.historyPage,
      PAGE_SIZE
    ],
    queryFn: () =>
      getArchitectureIntelligenceHistory(accessToken, repositoryId, current.historyPage, PAGE_SIZE),
    enabled: Boolean(accessToken && repositoryId)
  });

  const update = (values: Partial<typeof state>) => setState({ ...current, ...values });
  const data = query.data;
  return (
    <section className="grid gap-5" aria-labelledby="architecture-intelligence-title">
      <PageHeading
        eyebrow="Deterministic architecture"
        title={<span id="architecture-intelligence-title">Architecture Intelligence</span>}
        description="Evidence-backed circular dependencies, inferred-module measurements, and adjacent compatible changes."
      />
      <Link
        className="w-fit text-sm font-medium text-primary hover:underline"
        to={`/repositories/${encodeURIComponent(repositoryId)}/architecture-history`}
      >
        View Architecture History
      </Link>
      {query.isLoading ? (
        <StatePanel
          title="Loading Architecture Intelligence"
          description="Loading the current promoted architecture result."
          tone="loading"
        />
      ) : null}
      {query.isError ? (
        <StatePanel
          title="Architecture Intelligence unavailable"
          description="The current architecture result could not be loaded."
          tone="error"
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RefreshCw />
              Retry
            </Button>
          }
        />
      ) : null}
      {!query.isLoading && !query.isError && !data?.processing ? (
        <StatePanel
          title="Architecture processing has not started"
          description="Intelligence will appear after a promoted context schedules architecture processing."
          tone="empty"
        />
      ) : null}
      {data?.processing ? <ProcessingCard processing={data.processing} /> : null}
      {data?.processing && data.processing.status !== "COMPLETED" ? (
        <StatePanel
          title={`Processing ${data.processing.status.toLowerCase()}`}
          description={
            data.processing.failureCategory ??
            "No completed architecture intelligence is available for this context yet."
          }
          tone={
            data.processing.status === "FAILED"
              ? "error"
              : data.processing.status === "INCOMPATIBLE"
                ? "warning"
                : "loading"
          }
        />
      ) : null}
      {data?.intelligence ? (
        <>
          <SummaryCard
            data={data.intelligence.summary}
            compatibility={data.intelligence.compatibility}
          />
          <FindingFilters state={current} update={update} />
          <Findings findings={data.intelligence.findings.items} />
          <Pager
            pagination={data.intelligence.findings.pagination}
            onPage={(page) => update({ page })}
          />
          <Measurements items={data.intelligence.modules.items} />
          <Pager
            pagination={data.intelligence.modules.pagination}
            onPage={(modulePage) => update({ modulePage })}
          />
          <Changes changes={data.intelligence.changes} />
        </>
      ) : null}
      {history.data ? <History items={history.data.items} /> : null}
      {history.isLoading ? (
        <StatePanel
          title="Loading processing history"
          description="Loading promoted Architecture Intelligence results."
          tone="loading"
        />
      ) : null}
      {history.isError ? (
        <StatePanel
          title="Processing history unavailable"
          description="Architecture processing history could not be loaded."
          tone="error"
          action={
            <Button variant="outline" onClick={() => void history.refetch()}>
              <RefreshCw />
              Retry
            </Button>
          }
        />
      ) : null}
      {!history.isLoading && !history.isError && history.data?.items.length === 0 ? (
        <StatePanel
          title="No processing history"
          description="Historical results will appear after promoted contexts are processed."
          tone="empty"
        />
      ) : null}
      {history.data ? (
        <Pager
          pagination={history.data.pagination}
          onPage={(historyPage) => update({ historyPage })}
        />
      ) : null}
    </section>
  );
}

function ProcessingCard({
  processing
}: {
  processing: NonNullable<ArchitectureIntelligenceResponse["processing"]>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Processing and freshness</CardTitle>
          <Badge
            tone={
              processing.status === "COMPLETED"
                ? "success"
                : processing.status === "FAILED"
                  ? "error"
                  : "pending"
            }
          >
            {processing.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Commit" value={processing.commitSha} mono />
          <Detail label="Project context" value={processing.projectContextId} mono />
          <Detail label="Processor" value={processing.processorVersion} mono />
          <Detail label="Analyzer" value={processing.analyzerVersion} mono />
          <Detail label="Context" value={processing.contextVersion} mono />
          <Detail label="Attempts" value={String(processing.attemptCount)} />
          <Detail
            label="Next eligible attempt"
            value={new Date(processing.nextAttemptAt).toLocaleString()}
          />
          <Detail
            label="Completed"
            value={
              processing.completedAt
                ? new Date(processing.completedAt).toLocaleString()
                : "Not completed"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  data,
  compatibility
}: {
  data: NonNullable<ArchitectureIntelligenceResponse["intelligence"]>["summary"];
  compatibility: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current summary</CardTitle>
          <Badge>{compatibility}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="rounded border p-3">
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs text-muted-foreground">{label(key)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FindingFilters({
  state,
  update
}: {
  state: { ruleId: string; confidence: string; lifecycle: string };
  update: (value: {
    ruleId?: string;
    confidence?: ArchitectureIntelligenceConfidence | "";
    lifecycle?: ArchitectureFindingLifecycle | "";
    page?: number;
  }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finding filters</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Filter
          label="Rule"
          value={state.ruleId}
          options={["architecture.circular-dependency"]}
          onChange={(ruleId) => update({ ruleId, page: 1 })}
        />
        <Filter
          label="Confidence"
          value={state.confidence}
          options={["HIGH", "MEDIUM", "LOW"]}
          onChange={(confidence) =>
            update({ confidence: confidence as ArchitectureIntelligenceConfidence | "", page: 1 })
          }
        />
        <Filter
          label="Lifecycle"
          value={state.lifecycle}
          options={["NEW", "PERSISTING", "RESOLVED", "RECURRING"]}
          onChange={(lifecycle) =>
            update({ lifecycle: lifecycle as ArchitectureFindingLifecycle | "", page: 1 })
          }
        />
      </CardContent>
    </Card>
  );
}

function Filter({
  label: title,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{title}</Label>
      <Select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        <option value="">All</option>
        {options.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </Select>
    </div>
  );
}

function Findings({ findings }: { findings: ArchitectureFindingItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Circular dependencies</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings match the current filters.</p>
        ) : (
          findings.map((finding) => (
            <article key={finding.occurrenceId} className="rounded border p-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{finding.lifecycle ?? "BOUNDARY"}</Badge>
                <Badge tone="neutral">{finding.confidence}</Badge>
              </div>
              {finding.subject.kind === "CYCLE" ? (
                <div className="mt-3 text-sm">
                  <div className="text-xs text-muted-foreground">Modules in cycle</div>
                  <div className="font-mono">{finding.subject.moduleIds.join(", ")}</div>
                </div>
              ) : (
                <div className="mt-3 font-mono text-sm">{finding.fingerprint}</div>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">Inspect evidence</summary>
                <ul className="mt-2 grid gap-2 text-xs text-muted-foreground">
                  {finding.evidence.map((item, index) => (
                    <li key={`${item.kind}:${index}`} className="rounded bg-muted/40 p-2 font-mono">
                      {evidenceText(item)}
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Measurements({
  items
}: {
  items: NonNullable<ArchitectureIntelligenceResponse["intelligence"]>["modules"]["items"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Module measurements</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No inferred-module measurements are available for this processing result.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                {[
                  "Module",
                  "Files",
                  "Declarations",
                  "Fan-in",
                  "Fan-out",
                  "Total degree",
                  "Relationships",
                  "Confidence"
                ].map((item) => (
                  <th key={item} className="p-2">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.moduleId} className="border-b">
                  <td className="p-2 font-mono">{item.moduleId}</td>
                  <td className="p-2">{item.sourceFileCount}</td>
                  <td className="p-2">{item.declarationCount}</td>
                  <td className="p-2">{item.fanIn}</td>
                  <td className="p-2">{item.fanOut}</td>
                  <td className="p-2">{item.totalDegree}</td>
                  <td className="p-2">{item.relationshipCount}</td>
                  <td className="p-2">{item.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function Changes({
  changes
}: {
  changes: NonNullable<ArchitectureIntelligenceResponse["intelligence"]>["changes"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Architecture changes</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <ChangeList title="Added modules" values={changes.addedModules} />
        <ChangeList title="Removed modules" values={changes.removedModules} />
        <ChangeList
          title="Added relationships"
          values={changes.addedRelationships.map(
            (item) => `${item.sourceModuleId} → ${item.targetModuleId}`
          )}
        />
        <ChangeList
          title="Removed relationships"
          values={changes.removedRelationships.map(
            (item) => `${item.sourceModuleId} → ${item.targetModuleId}`
          )}
        />
      </CardContent>
    </Card>
  );
}

function ChangeList({ title, values }: { title: string; values: string[] }) {
  return (
    <section>
      <h3 className="font-medium">{title}</h3>
      {values.length ? (
        <ul className="mt-2 grid gap-1 font-mono text-xs">
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No changes since the previous compatible context.
        </p>
      )}
    </section>
  );
}

function History({ items }: { items: ArchitectureIntelligenceHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing history</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.historyId}
            className="grid gap-1 rounded border p-3 text-sm md:grid-cols-4"
          >
            <span className="font-mono">{item.commitSha.slice(0, 8)}</span>
            <span>{item.processing?.status ?? "NOT SCHEDULED"}</span>
            <span>{item.compatibility ?? "NOT EVALUATED"}</span>
            <span>{new Date(item.promotedAt).toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Pager({
  pagination,
  onPage
}: {
  pagination: { page: number; pageSize: number; total: number; hasNextPage: boolean };
  onPage: (page: number) => void;
}) {
  if (!pagination.total) return null;
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} · {pagination.total} total
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!pagination.hasNextPage}
          onClick={() => onPage(pagination.page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function Detail({
  label: title,
  value,
  mono = false
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{title}</dt>
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </div>
  );
}
function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (item) => item.toUpperCase());
}
function evidenceText(item: ArchitectureFindingItem["evidence"][number]) {
  if (item.kind === "CANONICAL_ARCHITECTURE_DEPENDENCIES")
    return `${item.dependencyIds.length} canonical dependency(ies) · ${item.relationshipIds.length} source relationship(s)`;
  if (item.kind === "MODULE") return `${item.moduleId} · ${item.confidence}`;
  if (item.kind === "MODULE_RELATIONSHIP")
    return `${item.sourceModuleId} → ${item.targetModuleId} · ${item.relationshipCount} relationship(s) · ${item.confidence}`;
  return `${item.sourcePath} → ${item.targetPath} · ${item.relationshipKind} ${item.specifier}${item.location ? ` · line ${item.location.startLine}` : ""}`;
}
