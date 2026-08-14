import {
  AlertCircle,
  Box,
  Code2,
  FileText,
  GitBranch,
  Layers3,
  Package,
  Route
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type {
  AnalysisIssue,
  AnalysisResult,
  DependencyEdge,
  PackageManagerDetection,
  SourceFileStructure,
  SourceRelationship
} from "@/features/analysis/api/analysis-api";

type AnalysisResultDetailsProps = {
  result: AnalysisResult;
};

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function displayPackageManager(packageManager: PackageManagerDetection): string {
  if (packageManager.status === "DETECTED") {
    return packageManager.packageManager;
  }

  if (packageManager.status === "CONFLICT") {
    return `CONFLICT: ${packageManager.candidates
      .map((candidate) => candidate.packageManager)
      .join(", ")}`;
  }

  return "UNKNOWN";
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{children}</p>
  );
}

function Section({
  children,
  icon: Icon,
  title
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-md border bg-card/70">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="size-4" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="grid gap-4 p-4">{children}</div>
    </section>
  );
}

function ShortValue({ value }: { value: string }) {
  return (
    <span className="break-all font-mono text-xs" title={value}>
      {value}
    </span>
  );
}

const overviewRows = (result: AnalysisResult): readonly [string, string][] => [
  ["Analysis ID", result.analysisId],
  ["Repository ID", result.repositoryId],
  ["Scan ID", result.scanId],
  ["Commit SHA", result.commitSha],
  ["Analyzer", result.analyzerVersion],
  ["Generated", displayDate(result.generatedAt)]
];

export function AnalysisResultDetails({ result }: AnalysisResultDetailsProps) {
  return (
    <div className="grid gap-4">
      <Section icon={Layers3} title="Overview">
        <dl className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {overviewRows(result).map(([label, value]) => (
            <div key={label} className="min-w-0 bg-card/95 p-3">
              <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
              <dd className="mt-1">
                <ShortValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section icon={Box} title="Project">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricList title="Ecosystems" values={result.project.ecosystems} />
          <MetricList
            title="Languages"
            values={result.project.languages.map(
              (language) => `${language.language} (${language.fileCount})`
            )}
          />
          <MetricList
            title="Frameworks"
            values={result.project.frameworks.map((framework) => framework.framework)}
          />
          <MetricList
            title="Package Manager"
            values={[displayPackageManager(result.project.packageManager)]}
          />
        </div>

        <CollectionList
          emptyText="No manifests detected."
          items={result.project.manifests.map((manifest) => ({
            key: manifest.path,
            title: manifest.path,
            detail: `${manifest.type}${manifest.isPrimary ? " primary" : ""}`
          }))}
          title="Manifests"
        />

        <CollectionList
          emptyText="No packages detected."
          items={result.project.packages.map((packageJson) => ({
            key: packageJson.path,
            title: packageJson.name ?? packageJson.path,
            detail: `${packageJson.path}${packageJson.version ? ` ${packageJson.version}` : ""}`
          }))}
          title="Packages"
        />

        <CollectionList
          emptyText="No project issues."
          items={result.project.issues.map((issue) => ({
            key: `${issue.path}:${issue.code}`,
            title: issue.code,
            detail: issue.path
          }))}
          title="Project Issues"
        />
      </Section>

      <Section icon={FileText} title="Files">
        {result.files.length === 0 ? (
          <EmptyState>No file classifications.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {result.files.map((file) => (
              <div
                key={file.path}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/70 p-3"
              >
                <ShortValue value={file.path} />
                <Badge tone={file.category === "SOURCE" ? "success" : "neutral"}>
                  {file.category}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Code2} title="Source Structure">
        {result.sourceStructures.length === 0 ? (
          <EmptyState>No source structures.</EmptyState>
        ) : (
          <div className="grid gap-3">
            {result.sourceStructures.map((source) => (
              <SourceStructureItem key={source.path} source={source} />
            ))}
          </div>
        )}
      </Section>

      <Section icon={GitBranch} title="Relationships">
        {result.relationships.length === 0 ? (
          <EmptyState>No relationships.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {result.relationships.map((relationship) => (
              <RelationshipItem key={relationshipKey(relationship)} relationship={relationship} />
            ))}
          </div>
        )}
      </Section>

      <Section icon={Package} title="Dependencies">
        {result.dependencies.length === 0 ? (
          <EmptyState>No dependencies.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {result.dependencies.map((dependency) => (
              <DependencyItem key={dependencyKey(dependency)} dependency={dependency} />
            ))}
          </div>
        )}
      </Section>

      <Section icon={AlertCircle} title="Issues">
        {result.issues.length === 0 ? (
          <EmptyState>No analysis issues.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {result.issues.map((issue) => (
              <IssueItem key={issueKey(issue)} issue={issue} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function MetricList({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <div className="rounded-md border bg-background/70 p-3">
      <h3 className="text-xs uppercase text-muted-foreground">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <span className="text-sm text-muted-foreground">None</span>
        ) : (
          values.map((value) => (
            <Badge key={value} tone="neutral">
              {value}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

function CollectionList({
  emptyText,
  items,
  title
}: {
  emptyText: string;
  items: readonly { detail: string; key: string; title: string }[];
  title: string;
}) {
  return (
    <div className="grid gap-2">
      <h3 className="text-xs uppercase text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        items.map((item) => (
          <div key={item.key} className="min-w-0 rounded-md border bg-background/70 p-3">
            <p className="break-words text-sm font-medium">{item.title}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))
      )}
    </div>
  );
}

function SourceStructureItem({ source }: { source: SourceFileStructure }) {
  return (
    <article className="grid gap-3 rounded-md border bg-background/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShortValue value={source.path} />
        <Badge>{source.language}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <StructureColumn
          emptyText="No declarations."
          title="Declarations"
          values={source.declarations.map(
            (declaration) =>
              `${declaration.kind} ${declaration.name} L${declaration.location.startLine}`
          )}
        />
        <StructureColumn
          emptyText="No imports."
          title="Imports"
          values={source.imports.map((sourceImport) => sourceImport.moduleSpecifier)}
        />
        <StructureColumn
          emptyText="No exports."
          title="Exports"
          values={source.exports.map((sourceExport) =>
            sourceExport.moduleSpecifier
              ? `${sourceExport.kind} ${sourceExport.moduleSpecifier}`
              : `${sourceExport.kind} ${sourceExport.name ?? ""}`.trim()
          )}
        />
      </div>
      {source.issues.length > 0 ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          {source.issues.map((issue) => (
            <p
              key={`${source.path}:${issue.code}:${issue.message}`}
              className="text-xs text-destructive"
            >
              {issue.code}: {issue.message}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function StructureColumn({
  emptyText,
  title,
  values
}: {
  emptyText: string;
  title: string;
  values: readonly string[];
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-xs uppercase text-muted-foreground">{title}</h3>
      {values.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-1 grid gap-1">
          {values.map((value) => (
            <li key={value} className="break-words text-sm">
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RelationshipItem({ relationship }: { relationship: SourceRelationship }) {
  const target = relationship.targetPath ?? relationship.targetPackageName ?? "Unresolved";

  return (
    <article className="grid gap-2 rounded-md border bg-background/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={relationship.resolved ? "success" : "muted"}>
          {relationship.resolved ? "RESOLVED" : "UNRESOLVED"}
        </Badge>
        <Badge>{relationship.kind}</Badge>
        <Badge tone="muted">{relationship.targetKind}</Badge>
      </div>
      <div className="grid gap-2 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
        <ShortValue value={relationship.sourcePath} />
        <Route className="hidden size-4 text-muted-foreground md:block" />
        <ShortValue value={target} />
      </div>
      <p className="break-all text-xs text-muted-foreground">Specifier: {relationship.specifier}</p>
    </article>
  );
}

function DependencyItem({ dependency }: { dependency: DependencyEdge }) {
  return (
    <article className="grid gap-2 rounded-md border bg-background/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={dependency.resolved ? "success" : "muted"}>
          {dependency.resolved ? "RESOLVED" : "UNRESOLVED"}
        </Badge>
        <Badge>{dependency.dependencyKind}</Badge>
        <Badge tone="muted">{dependency.kind}</Badge>
      </div>
      <ShortValue value={dependency.sourcePath} />
      <p className="break-all text-sm">
        {dependency.targetPath ?? dependency.packageName ?? dependency.specifier}
      </p>
      {dependency.packageDependency ? (
        <p className="text-xs text-muted-foreground">
          {dependency.packageDependency.type} {dependency.packageDependency.version} from{" "}
          {dependency.packageDependency.manifestPath}
        </p>
      ) : null}
    </article>
  );
}

function IssueItem({ issue }: { issue: AnalysisIssue }) {
  const extra =
    issue.stage === "SOURCE_STRUCTURE"
      ? issue.message
      : issue.stage === "RELATIONSHIP_ANALYSIS"
        ? issue.specifier
        : "";

  return (
    <article className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="muted">{issue.stage}</Badge>
        <span className="break-words text-sm font-medium text-destructive">{issue.code}</span>
      </div>
      <p className="mt-1 break-all text-xs text-destructive/90">{issue.path}</p>
      {extra ? <p className="mt-1 break-words text-xs text-destructive/90">{extra}</p> : null}
    </article>
  );
}

function relationshipKey(relationship: SourceRelationship): string {
  return [
    relationship.sourcePath,
    relationship.kind,
    relationship.specifier,
    relationship.targetPath,
    relationship.targetPackageName
  ].join(":");
}

function dependencyKey(dependency: DependencyEdge): string {
  return [
    dependency.sourcePath,
    dependency.kind,
    dependency.specifier,
    dependency.targetPath,
    dependency.packageName
  ].join(":");
}

function issueKey(issue: AnalysisIssue): string {
  if (issue.stage === "RELATIONSHIP_ANALYSIS") {
    return `${issue.stage}:${issue.path}:${issue.specifier}:${issue.code}`;
  }

  return `${issue.stage}:${issue.path}:${issue.code}`;
}
