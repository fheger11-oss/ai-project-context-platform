import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
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
    <section className="grid gap-5" aria-labelledby="dependency-intelligence-title">
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
              className="rounded border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-mono">{finding.packageName}</strong>
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
                      className="rounded bg-muted/40 p-2"
                    >
                      <span className="font-mono">{item.manifestPath}</span> ·{" "}
                      <strong>{item.declaredVersion}</strong> ·{" "}
                      {dependencyTypeLabel(item.dependencyType)}
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
      <CardContent className="overflow-x-auto">
        {data.declarations.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No dependency declarations are present in the current snapshot.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
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
                  className="border-b"
                >
                  <td className="p-2 font-mono">{item.packageName}</td>
                  <td className="p-2 font-mono">{item.declaredVersion}</td>
                  <td className="p-2">{dependencyTypeLabel(item.dependencyType)}</td>
                  <td className="p-2 font-mono">{item.manifestPath}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <div className="flex items-center justify-between gap-3">
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
    <ul className="grid gap-2">
      {items.map((item) => (
        <li
          key={`${item.manifestPath}:${item.packageName}:${item.type}`}
          className="rounded border p-3 text-sm"
        >
          <Badge>{changeLabel(item.type)}</Badge>
          <span className="ml-2 font-mono">{item.packageName}</span>
          <div className="mt-1 text-xs text-muted-foreground">
            {item.manifestPath} · {changeDetail(item)}
          </div>
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
      <CardContent className="grid gap-1 text-sm">
        <div>
          Commit <span className="font-mono">{value.commitSha}</span>
        </div>
        <div>
          Context <span className="font-mono">{value.projectContextId}</span>
        </div>
        <div>
          Analyzer <span className="font-mono">{value.analyzerVersion}</span>
        </div>
        <div>
          Processor <span className="font-mono">{value.dependencyProcessorVersion}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-3">
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
