import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  DependencyDeclarationChangeItem,
  DependencyFindingItem,
  DependencyIntelligenceHistoryResponse,
  DependencyIntelligenceResponse,
  DependencyPagination
} from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalText } from "@/components/ui/technical-text";
import {
  getDependencyIntelligence,
  getDependencyIntelligenceHistory
} from "@/features/dependency-intelligence/api/dependency-intelligence-api";

const PAGE_SIZE = 20;

// Exported for focused repository-isolation tests.
// eslint-disable-next-line react-refresh/only-export-components
export function dependencyIntelligenceQueryKey(repositoryId: string, state: object) {
  return ["repositories", repositoryId, "dependency-intelligence", state] as const;
}

export function DependencyIntelligencePanel({
  accessToken,
  repositoryId
}: {
  accessToken: string;
  repositoryId: string;
}) {
  const [state, setState] = useState({ repositoryId, page: 1, findingPage: 1, historyPage: 1 });
  const current =
    state.repositoryId === repositoryId
      ? state
      : { repositoryId, page: 1, findingPage: 1, historyPage: 1 };
  const options = {
    page: current.page,
    pageSize: PAGE_SIZE,
    findingPage: current.findingPage,
    findingPageSize: PAGE_SIZE
  };
  const intelligence = useQuery({
    queryKey: dependencyIntelligenceQueryKey(repositoryId, options),
    queryFn: () => getDependencyIntelligence(accessToken, repositoryId, options),
    enabled: Boolean(accessToken && repositoryId)
  });
  const historyOptions = { ...options, page: current.historyPage };
  const history = useQuery({
    queryKey: dependencyIntelligenceQueryKey(repositoryId, { history: historyOptions }),
    queryFn: () => getDependencyIntelligenceHistory(accessToken, repositoryId, historyOptions),
    enabled: Boolean(accessToken && repositoryId)
  });
  const update = (values: Partial<typeof state>) => setState({ ...current, ...values });

  return (
    <section className="grid min-w-0 gap-5" aria-labelledby="dependency-intelligence-title">
      <PageHeading
        eyebrow="Deterministic dependencies"
        title={<span id="dependency-intelligence-title">Dependency Intelligence</span>}
        description="Declared dependency inventory, exact declaration divergence, and adjacent promoted-context changes."
      />
      {intelligence.isLoading ? (
        <StatePanel
          title="Loading Dependency Intelligence"
          description="Loading the current promoted dependency snapshot."
          tone="loading"
        />
      ) : null}
      {intelligence.isError ? (
        <StatePanel
          title="Dependency Intelligence unavailable"
          description="The current dependency snapshot could not be loaded."
          tone="error"
          action={
            <Button variant="outline" onClick={() => void intelligence.refetch()}>
              <RefreshCw />
              Retry
            </Button>
          }
        />
      ) : null}
      {!intelligence.isLoading &&
      !intelligence.isError &&
      intelligence.data &&
      !intelligence.data.available ? (
        <StatePanel
          title="No current promoted context"
          description="Dependency Intelligence will appear after a ProjectContext is promoted."
          tone="empty"
        />
      ) : null}
      {intelligence.data?.available ? (
        <Current
          data={intelligence.data}
          onDeclarationPage={(page) => update({ page })}
          onFindingPage={(findingPage) => update({ findingPage })}
        />
      ) : null}
      {history.isLoading ? (
        <StatePanel
          title="Loading dependency history"
          description="Loading the adjacent promoted-context comparison."
          tone="loading"
        />
      ) : null}
      {history.isError ? (
        <StatePanel
          title="Dependency history unavailable"
          description="The historical comparison could not be loaded."
          tone="error"
          action={
            <Button variant="outline" onClick={() => void history.refetch()}>
              <RefreshCw />
              Retry
            </Button>
          }
        />
      ) : null}
      {history.data?.available ? (
        <History data={history.data} onPage={(historyPage) => update({ historyPage })} />
      ) : null}
    </section>
  );
}

function Current({
  data,
  onDeclarationPage,
  onFindingPage
}: {
  data: DependencyIntelligenceResponse;
  onDeclarationPage: (page: number) => void;
  onFindingPage: (page: number) => void;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Current dependency summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Metric label="Packages" value={data.summary?.distinctPackageCount ?? 0} />
          <Metric label="Declarations" value={data.summary?.declarationCount ?? 0} />
          <Metric
            label="Declaration divergences"
            value={data.summary?.divergenceFindingCount ?? 0}
          />
        </CardContent>
      </Card>
      {data.provenance ? (
        <Provenance title="Current promoted context" value={data.provenance} />
      ) : null}
      <Findings items={data.findings.items} />
      <Pager pagination={data.findings.pagination} onPage={onFindingPage} />
      <Declarations data={data} />
      <Pager pagination={data.declarations.pagination} onPage={onDeclarationPage} />
    </>
  );
}

function Findings({ items }: { items: DependencyFindingItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Declaration divergence findings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No declaration divergences were found.</p>
        ) : (
          items.map((finding) => (
            <article
              key={`${finding.fingerprint}:${finding.lifecycle}`}
              className="min-w-0 rounded border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <TechnicalText className="text-sm font-semibold text-foreground">
                  {finding.packageName}
                </TechnicalText>
                <Badge>{finding.lifecycle}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This package has different exact declared version specifications across repository
                manifests.
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Inspect declaration evidence
                </summary>
                <ul className="mt-2 grid gap-2 text-xs">
                  {finding.evidence.map((item) => (
                    <li
                      key={`${item.manifestPath}:${item.dependencyType}:${item.declaredVersion}`}
                      className="min-w-0 rounded bg-muted/40 p-2"
                    >
                      <dl className="grid min-w-0 gap-2 sm:grid-cols-2">
                        <DataField
                          className="sm:col-span-2"
                          label="Manifest"
                          value={item.manifestPath}
                          technical
                        />
                        <DataField
                          label="Declared version"
                          value={item.declaredVersion}
                          technical
                        />
                        <DataField
                          label="Dependency type"
                          value={dependencyTypeLabel(item.dependencyType)}
                        />
                      </dl>
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

function Declarations({ data }: { data: DependencyIntelligenceResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dependency declarations</CardTitle>
      </CardHeader>
      <CardContent>
        {data.declarations.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No dependency declarations are present in the current snapshot.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {data.declarations.items.map((item) => (
                <article
                  key={`${item.manifestPath}:${item.packageName}:${item.dependencyType}:${item.declaredVersion}`}
                  className="min-w-0 rounded-md border bg-background/35 p-3"
                >
                  <TechnicalText className="text-sm font-medium text-foreground">
                    {item.packageName}
                  </TechnicalText>
                  <dl className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                    <DataField label="Declared version" value={item.declaredVersion} technical />
                    <DataField
                      label="Dependency type"
                      value={dependencyTypeLabel(item.dependencyType)}
                    />
                    <DataField
                      className="sm:col-span-2"
                      label="Manifest"
                      value={item.manifestPath}
                      technical
                    />
                  </dl>
                </article>
              ))}
            </div>
            <DataTableRegion label="Dependency declarations table">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Package</th>
                    <th className="p-2">Declared version</th>
                    <th className="p-2">Dependency type</th>
                    <th className="p-2">Manifest</th>
                  </tr>
                </thead>
                <tbody>
                  {data.declarations.items.map((item) => (
                    <tr
                      key={`${item.manifestPath}:${item.packageName}:${item.dependencyType}:${item.declaredVersion}`}
                      className="border-b align-top"
                    >
                      <td className="p-2">
                        <TechnicalText>{item.packageName}</TechnicalText>
                      </td>
                      <td className="p-2">
                        <TechnicalText>{item.declaredVersion}</TechnicalText>
                      </td>
                      <td className="p-2">{dependencyTypeLabel(item.dependencyType)}</td>
                      <td className="p-2">
                        <TechnicalText>{item.manifestPath}</TechnicalText>
                      </td>
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

function History({
  data,
  onPage
}: {
  data: DependencyIntelligenceHistoryResponse;
  onPage: (page: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Historical comparison</CardTitle>
          <Badge>{data.compatibility ?? "UNAVAILABLE"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {data.compatibility === "NO_BASELINE" ? (
          <StatePanel
            title="No historical baseline"
            description="This is the first promoted dependency snapshot available for comparison."
            tone="empty"
          />
        ) : null}
        {data.compatibility === "INCOMPATIBLE" ? (
          <StatePanel
            title="Incompatible historical baseline"
            description="The adjacent promoted snapshot uses a different analyzer, context, processor, or rule version. No declaration comparison was made."
            tone="warning"
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {data.current ? <Provenance title="Current" value={data.current} /> : null}
          {data.previous ? <Provenance title="Previous" value={data.previous} /> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="New" value={data.lifecycleCounts.new} />
          <Metric label="Persisting" value={data.lifecycleCounts.persisting} />
          <Metric label="Resolved" value={data.lifecycleCounts.resolved} />
          <Metric label="Recurring" value={data.lifecycleCounts.recurring} />
        </div>
        <Changes items={data.changes.items} />
        <Pager pagination={data.changes.pagination} onPage={onPage} />
      </CardContent>
    </Card>
  );
}

function Changes({ items }: { items: DependencyDeclarationChangeItem[] }) {
  if (!items.length)
    return (
      <p className="text-sm text-muted-foreground">
        No declaration changes are available for the adjacent compatible context.
      </p>
    );
  return (
    <ul className="grid min-w-0 gap-2">
      {items.map((item) => (
        <li
          key={`${item.manifestPath}:${item.packageName}:${item.type}`}
          className="min-w-0 rounded border p-3 text-sm"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge>{changeLabel(item.type)}</Badge>
            <TechnicalText className="text-sm text-foreground">{item.packageName}</TechnicalText>
          </div>
          <dl className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            <DataField label="Manifest" value={item.manifestPath} technical />
            <DataField label="Change" value={changeDetail(item) || "No value change"} technical />
          </dl>
        </li>
      ))}
    </ul>
  );
}

function Provenance({
  title,
  value
}: {
  title: string;
  value: NonNullable<DependencyIntelligenceResponse["provenance"]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
          <DataField label="Commit" value={value.commitSha} technical />
          <DataField label="Context" value={value.projectContextId} technical />
          <DataField label="Analyzer" value={value.analyzerVersion} technical />
          <DataField label="Processor" value={value.dependencyProcessorVersion} technical />
        </dl>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded border p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Pager({
  pagination,
  onPage
}: {
  pagination: DependencyPagination;
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

function dependencyTypeLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
function changeLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
function changeDetail(item: DependencyDeclarationChangeItem) {
  const versions =
    item.previousVersion || item.currentVersion
      ? `${item.previousVersion ?? "—"} → ${item.currentVersion ?? "—"}`
      : "";
  const types =
    item.previousDependencyType !== item.currentDependencyType
      ? `${dependencyTypeLabel(item.previousDependencyType ?? "—")} → ${dependencyTypeLabel(item.currentDependencyType ?? "—")}`
      : "";
  return [versions, types].filter(Boolean).join(" · ");
}
