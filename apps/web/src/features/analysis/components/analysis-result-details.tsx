import {
  AlertCircle,
  Box,
  Braces,
  Code2,
  FileText,
  GitBranch,
  Layers3,
  Package,
  Route
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
  AnalysisDependencyEdge as DependencyEdge,
  AnalysisIssue,
  AnalysisPackageDependency,
  AnalysisPackageManagerDetection as PackageManagerDetection,
  AnalysisResultResponse as AnalysisResult,
  AnalysisSourceFileStructure as SourceFileStructure,
  AnalysisSourceRelationship as SourceRelationship
} from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AnalysisResultDetailsProps = {
  result: AnalysisResult;
};

type Finding = {
  detail?: string;
  label: string;
  value: string;
};

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function labelValue(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayPackageManager(packageManager: PackageManagerDetection): string {
  if (packageManager.status === "DETECTED") {
    return labelValue(packageManager.packageManager);
  }

  if (packageManager.status === "CONFLICT") {
    return `Conflict: ${packageManager.candidates
      .map((candidate) => labelValue(candidate.packageManager))
      .join(", ")}`;
  }

  return "Unknown";
}

function packageManagerTone(
  packageManager: PackageManagerDetection
): "muted" | "success" | "warning" {
  if (packageManager.status === "DETECTED") {
    return "success";
  }

  if (packageManager.status === "CONFLICT") {
    return "warning";
  }

  return "muted";
}

function technicalRows(result: AnalysisResult): readonly [string, string][] {
  return [
    ["Analysis ID", result.analysisId],
    ["Repository ID", result.repositoryId],
    ["Scan ID", result.scanId],
    ["Commit SHA", result.commitSha],
    ["Analyzer", result.analyzerVersion],
    ["Generated", displayDate(result.generatedAt)]
  ];
}

function summaryFindings(result: AnalysisResult): Finding[] {
  const primaryLanguage = result.project.languages[0];
  const primaryFramework = result.project.frameworks[0];
  const primaryPackage =
    result.project.packages.find((item) => item.isPrimary) ?? result.project.packages[0];
  const findings: Finding[] = [];

  if (primaryLanguage) {
    findings.push({
      detail: `${primaryLanguage.fileCount} classified file${
        primaryLanguage.fileCount === 1 ? "" : "s"
      }`,
      label: "Primary language",
      value: labelValue(primaryLanguage.language)
    });
  }

  if (primaryFramework) {
    findings.push({
      detail: primaryFramework.evidence.join(", "),
      label: "Framework",
      value: labelValue(primaryFramework.framework)
    });
  }

  if (result.project.ecosystems.length > 0) {
    findings.push({
      label: "Ecosystem",
      value: result.project.ecosystems.map(labelValue).join(", ")
    });
  }

  findings.push({
    detail: `${result.files.length} file classification${
      result.files.length === 1 ? "" : "s"
    } returned`,
    label: "Files analyzed",
    value: String(result.files.length)
  });

  if (primaryPackage) {
    findings.push({
      detail: primaryPackage.path,
      label: "Primary package",
      value: primaryPackage.name ?? primaryPackage.path
    });
  }

  findings.push({
    detail: "Reported by the analysis engine",
    label: "Analysis issues",
    value: String(result.issues.length + result.project.issues.length)
  });

  return findings.slice(0, 6);
}

export function AnalysisResultDetails({ result }: AnalysisResultDetailsProps) {
  const findings = summaryFindings(result);

  return (
    <div className="grid gap-5">
      <section className="grid gap-3" aria-labelledby="analysis-intelligence-title">
        <div>
          <h2 id="analysis-intelligence-title" className="text-base font-semibold">
            Project intelligence
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            High-level facts detected directly from the completed scan.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {findings.map((finding) => (
            <InsightCard key={finding.label} finding={finding} />
          ))}
        </div>
      </section>

      <TechnologyStack result={result} />
      <ProjectStructure result={result} />
      <DependencySection
        dependencies={result.dependencies}
        projectDependencies={result.project.dependencies}
      />
      <AnalysisIssues projectIssues={result.project.issues} issues={result.issues} />
      <TechnicalProvenance result={result} />
    </div>
  );
}

function InsightCard({ finding }: { finding: Finding }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{finding.label}</p>
        <p className="mt-2 truncate text-lg font-semibold text-foreground" title={finding.value}>
          {finding.value}
        </p>
        {finding.detail ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {finding.detail}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Section({
  children,
  description,
  icon: Icon,
  title
}: {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: string }) {
  return <StatePanel description={children} title="No data detected" tone="empty" />;
}

function TechnologyStack({ result }: { result: AnalysisResult }) {
  return (
    <Section
      description="Languages, frameworks, package manifests, and package manager signals returned by analysis."
      icon={Braces}
      title="Technology stack"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TokenGroup
          emptyText="No ecosystems detected."
          title="Ecosystems"
          values={result.project.ecosystems.map(labelValue)}
        />
        <TokenGroup
          emptyText="No languages detected."
          title="Languages"
          values={result.project.languages.map(
            (language) => `${labelValue(language.language)} (${language.fileCount})`
          )}
        />
        <TokenGroup
          emptyText="No frameworks detected."
          title="Frameworks"
          values={result.project.frameworks.map((framework) => labelValue(framework.framework))}
        />
        <div className="rounded-md border border-border bg-surface/70 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Package manager</p>
          <div className="mt-2">
            <Badge tone={packageManagerTone(result.project.packageManager)}>
              {displayPackageManager(result.project.packageManager)}
            </Badge>
          </div>
        </div>
      </div>

      <CollectionList
        emptyText="No manifests detected."
        items={result.project.manifests.map((manifest) => ({
          detail: manifest.isPrimary ? "Primary manifest" : labelValue(manifest.type),
          key: manifest.path,
          title: manifest.path
        }))}
        title="Manifests"
      />

      <CollectionList
        emptyText="No packages detected."
        items={result.project.packages.map((packageJson) => ({
          detail: `${packageJson.path}${packageJson.version ? ` · ${packageJson.version}` : ""}`,
          key: packageJson.path,
          title: packageJson.name ?? packageJson.path
        }))}
        title="Packages"
      />
    </Section>
  );
}

function TokenGroup({
  emptyText,
  title,
  values
}: {
  emptyText: string;
  title: string;
  values: readonly string[];
}) {
  return (
    <div className="rounded-md border border-border bg-surface/70 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <span className="text-sm text-muted-foreground">{emptyText}</span>
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
      <h3 className="text-xs font-medium uppercase text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.key} className="min-w-0 rounded-md border bg-surface/70 p-3">
              <p className="break-words text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectStructure({ result }: { result: AnalysisResult }) {
  return (
    <Section
      description="File classifications, parsed source structure, and source relationships."
      icon={Layers3}
      title="Project structure"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat icon={FileText} label="Classified files" value={String(result.files.length)} />
        <SummaryStat
          icon={Code2}
          label="Parsed source files"
          value={String(result.sourceStructures.length)}
        />
        <SummaryStat
          icon={GitBranch}
          label="Relationships"
          value={String(result.relationships.length)}
        />
      </div>

      <details className="rounded-md border border-border bg-surface/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          File classifications
        </summary>
        <div className="grid gap-2 border-t p-3">
          {result.files.length === 0 ? (
            <EmptyState>No file classifications.</EmptyState>
          ) : (
            result.files.map((file) => (
              <div
                key={file.path}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/50 p-3"
              >
                <ShortValue value={file.path} />
                <Badge tone={file.category === "SOURCE" ? "success" : "neutral"}>
                  {labelValue(file.category)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-md border border-border bg-surface/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Source structures
        </summary>
        <div className="grid gap-3 border-t p-3">
          {result.sourceStructures.length === 0 ? (
            <EmptyState>No source structures.</EmptyState>
          ) : (
            result.sourceStructures.map((source) => (
              <SourceStructureItem key={source.path} source={source} />
            ))
          )}
        </div>
      </details>

      <details className="rounded-md border border-border bg-surface/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Relationships
        </summary>
        <div className="grid gap-2 border-t p-3">
          {result.relationships.length === 0 ? (
            <EmptyState>No relationships.</EmptyState>
          ) : (
            result.relationships.map((relationship) => (
              <RelationshipItem key={relationshipKey(relationship)} relationship={relationship} />
            ))
          )}
        </div>
      </details>
    </Section>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface/70 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SourceStructureItem({ source }: { source: SourceFileStructure }) {
  return (
    <article className="grid gap-3 rounded-md border bg-background/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShortValue value={source.path} />
        <Badge>{labelValue(source.language)}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <StructureColumn
          emptyText="No declarations."
          title="Declarations"
          values={source.declarations.map(
            (declaration) =>
              `${labelValue(declaration.kind)} ${declaration.name} L${
                declaration.location.startLine
              }`
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
              ? `${labelValue(sourceExport.kind)} ${sourceExport.moduleSpecifier}`
              : `${labelValue(sourceExport.kind)} ${sourceExport.name ?? ""}`.trim()
          )}
        />
      </div>
      {source.issues.length > 0 ? (
        <div className="rounded-md border border-error/30 bg-error/10 p-3">
          {source.issues.map((issue) => (
            <p key={`${source.path}:${issue.code}:${issue.message}`} className="text-xs text-error">
              {labelValue(issue.code)}: {issue.message}
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
      <h3 className="text-xs font-medium uppercase text-muted-foreground">{title}</h3>
      {values.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-1 grid gap-1">
          {values.map((value) => (
            <li key={value} className="break-words text-sm text-subtle-foreground">
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
    <article className="grid gap-2 rounded-md border bg-background/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={relationship.resolved ? "success" : "muted"}>
          {relationship.resolved ? "Resolved" : "Unresolved"}
        </Badge>
        <Badge>{labelValue(relationship.kind)}</Badge>
        <Badge tone="muted">{labelValue(relationship.targetKind)}</Badge>
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

function DependencySection({
  dependencies,
  projectDependencies
}: {
  dependencies: readonly DependencyEdge[];
  projectDependencies: readonly AnalysisPackageDependency[];
}) {
  return (
    <Section
      description="Package and local dependency edges found in analyzed source relationships."
      icon={Package}
      title="Dependencies"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat icon={Package} label="Dependency edges" value={String(dependencies.length)} />
        <SummaryStat
          icon={Box}
          label="Manifest dependencies"
          value={String(projectDependencies.length)}
        />
        <SummaryStat
          icon={AlertCircle}
          label="Unresolved edges"
          value={String(dependencies.filter((dependency) => !dependency.resolved).length)}
        />
      </div>
      {dependencies.length === 0 ? (
        <EmptyState>No dependencies.</EmptyState>
      ) : (
        <div className="grid gap-2">
          {dependencies.map((dependency) => (
            <DependencyItem key={dependencyKey(dependency)} dependency={dependency} />
          ))}
        </div>
      )}
    </Section>
  );
}

function DependencyItem({ dependency }: { dependency: DependencyEdge }) {
  return (
    <article className="grid gap-2 rounded-md border bg-surface/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={dependency.resolved ? "success" : "muted"}>
          {dependency.resolved ? "Resolved" : "Unresolved"}
        </Badge>
        <Badge>{labelValue(dependency.dependencyKind)}</Badge>
        <Badge tone="muted">{labelValue(dependency.kind)}</Badge>
      </div>
      <p className="break-all text-sm font-medium text-foreground">
        {dependency.targetPath ?? dependency.packageName ?? dependency.specifier}
      </p>
      <ShortValue value={dependency.sourcePath} />
      {dependency.packageDependency ? (
        <p className="text-xs text-muted-foreground">
          {labelValue(dependency.packageDependency.type)} {dependency.packageDependency.version}{" "}
          from {dependency.packageDependency.manifestPath}
        </p>
      ) : null}
    </article>
  );
}

function AnalysisIssues({
  issues,
  projectIssues
}: {
  issues: readonly AnalysisIssue[];
  projectIssues: AnalysisResult["project"]["issues"];
}) {
  const allIssues = [
    ...projectIssues.map((issue) => ({
      detail: issue.path,
      key: `project:${issue.path}:${issue.code}`,
      title: labelValue(issue.code)
    })),
    ...issues.map((issue) => ({
      detail:
        issue.stage === "SOURCE_STRUCTURE"
          ? `${issue.path}: ${issue.message}`
          : issue.stage === "RELATIONSHIP_ANALYSIS"
            ? `${issue.path}: ${issue.specifier}`
            : issue.path,
      key: issueKey(issue),
      title: `${labelValue(issue.stage)} · ${labelValue(issue.code)}`
    }))
  ];

  return (
    <Section
      description="Analysis-reported issues from project detection, parsing, or relationship resolution."
      icon={AlertCircle}
      title="Issues"
    >
      {allIssues.length === 0 ? (
        <StatePanel description="No analysis issues." title="No issues reported" tone="success" />
      ) : (
        <div className="grid gap-2">
          {allIssues.map((issue) => (
            <article key={issue.key} className="rounded-md border border-error/30 bg-error/10 p-3">
              <p className="break-words text-sm font-medium text-error">{issue.title}</p>
              <p className="mt-1 break-words text-xs text-error/90">{issue.detail}</p>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}

function TechnicalProvenance({ result }: { result: AnalysisResult }) {
  return (
    <details className="rounded-md border border-border bg-card/60">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        Technical provenance
      </summary>
      <dl className="grid gap-px border-t bg-border sm:grid-cols-2 lg:grid-cols-3">
        {technicalRows(result).map(([label, value]) => (
          <div key={label} className="min-w-0 bg-card/95 p-4">
            <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
            <dd className="mt-1">
              <ShortValue value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function ShortValue({ value }: { value: string }) {
  return (
    <span className="break-all font-mono text-xs text-subtle-foreground" title={value}>
      {value}
    </span>
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
