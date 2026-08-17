import { Boxes, Braces, Clock, DatabaseZap, GitBranch, Layers3, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ContextClaim, ContextEvidence, ProjectContextResponse } from "@ai-context/contracts";

import { Badge } from "@/components/ui/badge";

type ProjectContextDetailsProps = {
  context: ProjectContextResponse;
};

const sectionConfig: readonly {
  key: keyof Pick<
    ProjectContextResponse,
    | "project"
    | "technology"
    | "structure"
    | "architecture"
    | "entryPoints"
    | "testing"
    | "infrastructure"
  >;
  icon: LucideIcon;
  title: string;
}[] = [
  { key: "project", icon: ShieldCheck, title: "Project" },
  { key: "technology", icon: Braces, title: "Technology" },
  { key: "structure", icon: Layers3, title: "Structure" },
  { key: "architecture", icon: GitBranch, title: "Architecture" },
  { key: "entryPoints", icon: Clock, title: "Entry Points" },
  { key: "testing", icon: Boxes, title: "Testing" },
  { key: "infrastructure", icon: DatabaseZap, title: "Infrastructure" }
];

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function ShortValue({ value }: { value: string }) {
  return (
    <span className="break-all font-mono text-xs" title={value}>
      {value}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{children}</p>
  );
}

const overviewRows = (context: ProjectContextResponse): readonly [string, string][] => [
  ["Context Record", context.id],
  ["Semantic Context", context.contextId],
  ["Analysis ID", context.analysisId],
  ["Repository ID", context.repositoryId],
  ["Scan ID", context.scanId],
  ["Commit SHA", context.commitSha],
  ["Context Version", context.contextVersion],
  ["Generated", displayDate(context.generatedAt)],
  ["Persisted", displayDate(context.createdAt)]
];

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
      <div className="grid gap-3 p-4">{children}</div>
    </section>
  );
}

export function ProjectContextDetails({ context }: ProjectContextDetailsProps) {
  return (
    <div className="grid gap-4">
      <Section icon={DatabaseZap} title="Context Overview">
        <dl className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {overviewRows(context).map(([label, value]) => (
            <div key={label} className="min-w-0 bg-card/95 p-3">
              <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
              <dd className="mt-1">
                <ShortValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {sectionConfig.map((section) => (
        <Section key={section.key} icon={section.icon} title={section.title}>
          {context[section.key].claims.length === 0 ? (
            <EmptyState>No Context claims in this section.</EmptyState>
          ) : (
            <div className="grid gap-2">
              {context[section.key].claims.map((claim, index) => (
                <ClaimItem key={`${claim.kind}:${claim.confidence}:${index}`} claim={claim} />
              ))}
            </div>
          )}
        </Section>
      ))}

      {context.ambiguities.length > 0 ? (
        <Section icon={Clock} title="Ambiguities">
          {context.ambiguities.map((claim, index) => (
            <ClaimItem key={`ambiguity:${index}`} claim={claim} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function ClaimItem({ claim }: { claim: ContextClaim }) {
  return (
    <article className="grid gap-3 rounded-md border bg-background/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{claimType(claim)}</p>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
            {JSON.stringify(claim.value, null, 2)}
          </pre>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Badge tone={claim.kind === "OBSERVED" ? "success" : "neutral"}>{claim.kind}</Badge>
          <Badge tone={claim.confidence === "HIGH" ? "success" : "muted"}>{claim.confidence}</Badge>
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-xs uppercase text-muted-foreground">Evidence</p>
        {claim.evidence.length === 0 ? (
          <p className="text-xs text-muted-foreground">No evidence references.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {claim.evidence.map((evidence, index) => (
              <Badge key={`${evidence.kind}:${evidenceReference(evidence)}:${index}`} tone="muted">
                {evidence.kind}: {evidenceReference(evidence)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function claimType(claim: ContextClaim): string {
  if (typeof claim.value === "object" && claim.value !== null && "type" in claim.value) {
    return String((claim.value as { type: unknown }).type);
  }

  return "Context Claim";
}

function evidenceReference(evidence: ContextEvidence): string {
  const reference = evidence.reference;

  if ("path" in reference) {
    return reference.path;
  }

  if ("field" in reference) {
    return reference.field;
  }

  if ("sourcePath" in reference) {
    return `${reference.sourcePath}:${reference.specifier}`;
  }

  if ("manifestPath" in reference) {
    return `${reference.manifestPath}:${reference.name}`;
  }

  return evidence.kind;
}
