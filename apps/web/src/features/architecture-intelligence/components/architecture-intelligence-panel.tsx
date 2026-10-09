import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type {
  ArchitectureDependency,
  ArchitectureFindingItem,
  ArchitectureFindingLifecycle,
  ArchitectureIntelligenceHistoryItem,
  ArchitectureIntelligenceResponse,
  ArchitectureIntelligenceConfidence,
  ArchitecturalModule
} from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TechnicalText } from "@/components/ui/technical-text";
import {
  getArchitectureIntelligence,
  getArchitectureIntelligenceHistory,
  reprocessArchitectureIntelligence
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
  const queryClient = useQueryClient();
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
  const reprocess = useMutation({
    mutationFn: () => reprocessArchitectureIntelligence(accessToken, repositoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["repositories", repositoryId, "architecture-intelligence"]
      });
    }
  });

  const update = (values: Partial<typeof state>) => setState({ ...current, ...values });
  const data = query.data;
  return (
    <section className="grid min-w-0 gap-5" aria-labelledby="architecture-intelligence-title">
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
          action={
            data.processing.status === "INCOMPATIBLE" ? (
              <Button
                type="button"
                variant="outline"
                disabled={reprocess.isPending}
                onClick={() => reprocess.mutate()}
              >
                <RefreshCw className={reprocess.isPending ? "animate-spin" : undefined} />
                {reprocess.isPending ? "Reprocessing" : "Reprocess current commit"}
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {reprocess.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Reprocessing could not be started. No historical result was changed.
        </p>
      ) : null}
      {data?.intelligence ? (
        <>
          <SummaryCard
            moduleCount={data.intelligence.architectureModel.modules.length}
            dependencyCount={data.intelligence.architectureModel.dependencies.length}
            findingCount={data.intelligence.summary.circularDependencyFindingCount}
            compatibility={data.intelligence.compatibility}
          />
          <Modules modules={data.intelligence.architectureModel.modules} />
          <Dependencies
            dependencies={data.intelligence.architectureModel.dependencies}
            modules={data.intelligence.architectureModel.modules}
          />
          <FindingFilters state={current} update={update} />
          <Findings
            findings={data.intelligence.findings.items}
            modules={data.intelligence.architectureModel.modules}
          />
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
        <div className="flex flex-wrap items-center justify-between gap-3">
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
      <CardContent className="min-w-0">
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
  moduleCount,
  dependencyCount,
  findingCount,
  compatibility
}: {
  moduleCount: number;
  dependencyCount: number;
  findingCount: number;
  compatibility: string;
}) {
  const values = [
    ["Modules", moduleCount],
    ["Dependencies", dependencyCount],
    ["Findings", findingCount]
  ] as const;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Current summary</CardTitle>
          <Badge>{compatibility}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {values.map(([title, value]) => (
          <div key={title} className="rounded border p-3">
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs text-muted-foreground">{title}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Modules({ modules }: { modules: readonly ArchitecturalModule[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No canonical modules are available.</p>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {modules.map((module) => (
                <article key={module.id} className="min-w-0 rounded-md border bg-background/35 p-3">
                  <TechnicalText className="text-sm font-medium text-foreground">
                    {module.name}
                  </TechnicalText>
                  <dl className="mt-3 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                    <DataField label="Kind" value={module.kind} />
                    <DataField label="Files" value={String(module.fileIds.length)} />
                    <DataField label="Root path" value={module.rootPath} technical />
                    <DataField label="Package" value={module.packageId} technical />
                    <DataField
                      className="sm:col-span-2"
                      label="Layers"
                      value={module.layers.map((layer) => layer.kind).join(", ") || "UNCLASSIFIED"}
                    />
                  </dl>
                </article>
              ))}
            </div>
            <DataTableRegion label="Modules table">
              <table className="min-w-[48rem] w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    {["Name", "Kind", "Root path", "Layers", "Package", "Files"].map((item) => (
                      <th key={item} className="p-2">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module.id} className="border-b align-top">
                      <td className="p-2 font-medium">{module.name}</td>
                      <td className="p-2">{module.kind}</td>
                      <td className="p-2">
                        <TechnicalText>{module.rootPath}</TechnicalText>
                      </td>
                      <td className="p-2">
                        {module.layers.map((layer) => layer.kind).join(", ") || "UNCLASSIFIED"}
                      </td>
                      <td className="p-2">
                        <TechnicalText>{module.packageId}</TechnicalText>
                      </td>
                      <td className="p-2">{module.fileIds.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableRegion>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Dependencies({
  dependencies,
  modules
}: {
  dependencies: readonly ArchitectureDependency[];
  modules: readonly ArchitecturalModule[];
}) {
  const modulesById = new Map(modules.map((module) => [module.id, module]));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dependencies</CardTitle>
      </CardHeader>
      <CardContent>
        {dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No canonical module dependencies are available.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {dependencies.map((dependency) => (
                <article
                  key={dependency.id}
                  className="min-w-0 rounded-md border bg-background/35 p-3"
                >
                  <TechnicalText className="text-sm font-medium text-foreground">
                    {moduleDisplay(dependency.sourceModuleId, modulesById)} →{" "}
                    {moduleDisplay(dependency.targetModuleId, modulesById)}
                  </TechnicalText>
                  <dl className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                    <DataField label="Dependency ID" value={dependency.id} technical />
                    <DataField label="Relationships" value={String(dependency.relationshipCount)} />
                    <DataField
                      className="sm:col-span-2"
                      label="Kinds"
                      value={dependency.relationshipKinds.join(", ")}
                    />
                  </dl>
                </article>
              ))}
            </div>
            <DataTableRegion label="Dependencies table">
              <table className="min-w-[38rem] w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Dependency</th>
                    <th className="p-2">Relationships</th>
                    <th className="p-2">Kinds</th>
                  </tr>
                </thead>
                <tbody>
                  {dependencies.map((dependency) => (
                    <tr key={dependency.id} className="border-b align-top">
                      <td className="p-2">
                        <span className="font-medium">
                          {moduleDisplay(dependency.sourceModuleId, modulesById)} →{" "}
                          {moduleDisplay(dependency.targetModuleId, modulesById)}
                        </span>
                        <TechnicalText className="mt-1 text-muted-foreground">
                          {dependency.id}
                        </TechnicalText>
                      </td>
                      <td className="p-2">{dependency.relationshipCount}</td>
                      <td className="p-2">{dependency.relationshipKinds.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableRegion>
          </>
        )}
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

function Findings({
  findings,
  modules
}: {
  findings: ArchitectureFindingItem[];
  modules: readonly ArchitecturalModule[];
}) {
  const modulesById = new Map(modules.map((module) => [module.id, module]));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Circular dependencies</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No architecture findings detected. This does not imply complete architecture coverage.
          </p>
        ) : (
          findings.map((finding) => (
            <article key={finding.occurrenceId} className="min-w-0 rounded border p-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">Circular Dependency</Badge>
                <Badge>{finding.lifecycle ?? "BOUNDARY"}</Badge>
                <Badge tone="neutral">{finding.confidence}</Badge>
                {finding.applicability ? <Badge>{finding.applicability}</Badge> : null}
              </div>
              {finding.subject.kind === "CYCLE" ? (
                <div className="mt-3 text-sm">
                  <div className="text-xs text-muted-foreground">Modules in cycle</div>
                  <TechnicalText className="mt-1 text-sm text-foreground">
                    {cyclePath(finding.subject.moduleIds, modulesById)}
                  </TechnicalText>
                </div>
              ) : (
                <TechnicalText className="mt-3 block text-sm text-foreground">
                  {finding.fingerprint}
                </TechnicalText>
              )}
              {finding.applicability === "PARTIALLY_APPLICABLE" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  This cycle is positively detected, but unresolved source relationships mean the
                  evaluated graph has incomplete coverage.
                </p>
              ) : null}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">Inspect evidence</summary>
                <ul className="mt-2 grid gap-2 text-xs text-muted-foreground">
                  {finding.evidence.map((item, index) => (
                    <li key={`${item.kind}:${index}`} className="min-w-0 rounded bg-muted/40 p-2">
                      <TechnicalText className="text-muted-foreground">
                        {evidenceText(item)}
                      </TechnicalText>
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
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No inferred-module measurements are available for this processing result.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {items.map((item) => (
                <article
                  key={item.moduleId}
                  className="min-w-0 rounded-md border bg-background/35 p-3"
                >
                  <TechnicalText className="text-sm font-medium text-foreground">
                    {item.moduleId}
                  </TechnicalText>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <DataField label="Files" value={String(item.sourceFileCount)} />
                    <DataField label="Declarations" value={String(item.declarationCount)} />
                    <DataField label="Fan-in" value={String(item.fanIn)} />
                    <DataField label="Fan-out" value={String(item.fanOut)} />
                    <DataField label="Total degree" value={String(item.totalDegree)} />
                    <DataField label="Relationships" value={String(item.relationshipCount)} />
                    <DataField className="col-span-2" label="Confidence" value={item.confidence} />
                  </dl>
                </article>
              ))}
            </div>
            <DataTableRegion label="Module measurements table">
              <table className="min-w-[50rem] w-full text-left text-sm">
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
                      <td className="p-2">
                        <TechnicalText>{item.moduleId}</TechnicalText>
                      </td>
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
            </DataTableRegion>
          </>
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
    <section className="min-w-0">
      <h3 className="font-medium">{title}</h3>
      {values.length ? (
        <ul className="mt-2 grid gap-1 font-mono text-xs">
          {values.map((value) => (
            <li key={value} className="min-w-0">
              <TechnicalText>{value}</TechnicalText>
            </li>
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
            className="grid min-w-0 gap-3 rounded border p-3 text-sm sm:grid-cols-2 xl:grid-cols-4"
          >
            <TechnicalText>{item.commitSha.slice(0, 8)}</TechnicalText>
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
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} · {pagination.total} total
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
        <Button
          size="sm"
          className="w-full"
          variant="outline"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          size="sm"
          className="w-full"
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
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{title}</dt>
      <dd className="mt-1 min-w-0">
        {mono ? (
          <TechnicalText>{value}</TechnicalText>
        ) : (
          <span className="break-words [overflow-wrap:anywhere]">{value}</span>
        )}
      </dd>
    </div>
  );
}

function DataField({
  className,
  label,
  technical = false,
  value
}: {
  className?: string;
  label: string;
  technical?: boolean;
  value: string;
}) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 text-sm text-foreground">
        {technical ? (
          <TechnicalText>{value}</TechnicalText>
        ) : (
          <span className="break-words [overflow-wrap:anywhere]">{value}</span>
        )}
      </dd>
    </div>
  );
}

function DataTableRegion({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="hidden min-w-0 md:block">
      <p className="mb-2 text-xs text-muted-foreground xl:hidden">
        Scroll horizontally to view all columns.
      </p>
      <div
        aria-label={label}
        className="max-w-full overflow-x-auto overscroll-x-contain rounded-sm"
        role="region"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
function moduleDisplay(
  moduleId: string,
  modulesById: ReadonlyMap<string, ArchitecturalModule>
): string {
  const module = modulesById.get(moduleId);
  return module ? `${module.name} (${moduleId})` : moduleId;
}
function cyclePath(
  moduleIds: readonly string[],
  modulesById: ReadonlyMap<string, ArchitecturalModule>
): string {
  const firstModuleId = moduleIds[0];
  if (!firstModuleId) return "";
  return [...moduleIds, firstModuleId].map((id) => moduleDisplay(id, modulesById)).join(" → ");
}
function evidenceText(item: ArchitectureFindingItem["evidence"][number]) {
  if (item.kind === "CANONICAL_ARCHITECTURE_DEPENDENCIES")
    return `Dependencies: ${item.dependencyIds.join(", ") || "none"} · Relationships: ${item.relationshipIds.join(", ") || "none"}`;
  if (item.kind === "MODULE") return `${item.moduleId} · ${item.confidence}`;
  if (item.kind === "MODULE_RELATIONSHIP")
    return `${item.sourceModuleId} → ${item.targetModuleId} · ${item.relationshipCount} relationship(s) · ${item.confidence}`;
  return `${item.sourcePath} → ${item.targetPath} · ${item.relationshipKind} ${item.specifier}${item.location ? ` · line ${item.location.startLine}` : ""}`;
}
