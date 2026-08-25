import {
  Boxes,
  Braces,
  Clock,
  DatabaseZap,
  Eye,
  GitBranch,
  Layers3,
  ListChecks,
  ShieldCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ContextClaim, ContextEvidence, ProjectContextResponse } from "@ai-context/contracts";

import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectContextDetailsProps = {
  context: ProjectContextResponse;
};

type ContextSectionKey = keyof Pick<
  ProjectContextResponse,
  | "project"
  | "technology"
  | "structure"
  | "architecture"
  | "entryPoints"
  | "testing"
  | "infrastructure"
>;

const sectionConfig: readonly {
  key: ContextSectionKey;
  description: string;
  icon: LucideIcon;
  title: string;
}[] = [
  {
    key: "project",
    description: "Identity and purpose claims represented in Context.",
    icon: ShieldCheck,
    title: "Project"
  },
  {
    key: "technology",
    description: "Languages, frameworks, manifests, and technology facts.",
    icon: Braces,
    title: "Technology"
  },
  {
    key: "structure",
    description: "Repository organization and structural knowledge.",
    icon: Layers3,
    title: "Structure"
  },
  {
    key: "architecture",
    description: "Architecture claims already present in the generated Context.",
    icon: GitBranch,
    title: "Architecture"
  },
  {
    key: "entryPoints",
    description: "Known entry points captured by the Context engine.",
    icon: Clock,
    title: "Entry Points"
  },
  {
    key: "testing",
    description: "Testing knowledge represented in Context.",
    icon: Boxes,
    title: "Testing"
  },
  {
    key: "infrastructure",
    description: "Infrastructure and configuration claims in Context.",
    icon: DatabaseZap,
    title: "Infrastructure"
  }
];

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function labelValue(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  return labelValue(evidence.kind);
}

function claimType(claim: ContextClaim): string {
  if (typeof claim.value === "object" && claim.value !== null && "type" in claim.value) {
    return labelValue(String((claim.value as { type: unknown }).type));
  }

  return "Context Claim";
}

function claimDisplayValue(claim: ContextClaim): string {
  if (typeof claim.value !== "object" || claim.value === null) {
    return String(claim.value);
  }

  const entries = Object.entries(claim.value).filter(([key]) => key !== "type");
  const firstEntry = entries[0];

  if (!firstEntry) {
    return claimType(claim);
  }

  const [, value] = firstEntry;

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

function confidenceTone(confidence: ContextClaim["confidence"]): "muted" | "success" | "warning" {
  if (confidence === "HIGH") {
    return "success";
  }

  if (confidence === "MEDIUM") {
    return "warning";
  }

  return "muted";
}

function kindTone(kind: ContextClaim["kind"]): "neutral" | "success" {
  return kind === "OBSERVED" ? "success" : "neutral";
}

function allClaims(context: ProjectContextResponse): readonly ContextClaim[] {
  return [
    ...sectionConfig.flatMap((section) => context[section.key].claims),
    ...context.ambiguities
  ];
}

function technicalRows(context: ProjectContextResponse): readonly [string, string][] {
  return [
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
}

export function ProjectContextDetails({ context }: ProjectContextDetailsProps) {
  const claims = allClaims(context);
  const totalClaims = claims.length;
  const observedClaims = claims.filter((claim) => claim.kind === "OBSERVED").length;
  const inferredClaims = claims.filter((claim) => claim.kind === "INFERRED").length;
  const evidenceCount = claims.reduce((total, claim) => total + claim.evidence.length, 0);
  const populatedSections = sectionConfig.filter(
    (section) => context[section.key].claims.length > 0
  );

  return (
    <div className="grid gap-4" aria-label="Generated project Context">
      <Card emphasis="primary" className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">Generated</Badge>
            <span className="text-xs text-muted-foreground">
              {displayDate(context.generatedAt)}
            </span>
          </div>
          <CardTitle>Structured project knowledge</CardTitle>
          <CardDescription>
            Context turns analysis output into claim-level project understanding with confidence and
            evidence preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ContextStat label="Claims" value={String(totalClaims)} />
          <ContextStat label="Observed" value={String(observedClaims)} />
          <ContextStat label="Inferred" value={String(inferredClaims)} />
          <ContextStat label="Evidence references" value={String(evidenceCount)} />
        </CardContent>
        <CardContent className="grid gap-3 border-t p-4 sm:grid-cols-2">
          <ContextStat label="Context version" value={context.contextVersion} />
          <ContextStat label="Generated" value={displayDate(context.generatedAt)} />
        </CardContent>
      </Card>

      {totalClaims === 0 ? (
        <StatePanel
          description="This Context exists, but it does not contain claim-level project knowledge."
          title="No Context claims"
          tone="empty"
        />
      ) : null}

      {populatedSections.map((section) => (
        <ContextSection
          key={section.key}
          claimCount={context[section.key].claims.length}
          description={section.description}
          icon={section.icon}
          title={section.title}
        >
          <div className="grid gap-2">
            {context[section.key].claims.map((claim, index) => (
              <ClaimItem key={`${claim.kind}:${claim.confidence}:${index}`} claim={claim} />
            ))}
          </div>
        </ContextSection>
      ))}

      {context.ambiguities.length > 0 ? (
        <ContextSection
          claimCount={context.ambiguities.length}
          description="Unresolved or less certain Context claims retained for review."
          icon={Clock}
          title="Ambiguities"
        >
          <div className="grid gap-2">
            {context.ambiguities.map((claim, index) => (
              <ClaimItem key={`ambiguity:${index}`} claim={claim} />
            ))}
          </div>
        </ContextSection>
      ) : null}

      <details className="rounded-md border border-border bg-card/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Context technical provenance
        </summary>
        <dl className="grid gap-px border-t bg-border sm:grid-cols-2 lg:grid-cols-3">
          {technicalRows(context).map(([label, value]) => (
            <div key={label} className="min-w-0 bg-card/95 p-4">
              <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
              <dd className="mt-1">
                <ShortValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function ContextSection({
  children,
  claimCount,
  description,
  icon: Icon,
  title
}: {
  children: ReactNode;
  claimCount: number;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-md border bg-surface/60">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Icon className="size-4 text-muted-foreground" />
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <Badge tone="muted">
          {claimCount} claim{claimCount === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="grid gap-3 p-4">{children}</div>
    </section>
  );
}

function ContextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/40 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

function ClaimItem({ claim }: { claim: ContextClaim }) {
  return (
    <article className="grid gap-3 rounded-md border bg-background/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ListChecks className="size-4 text-muted-foreground" />
            {claimType(claim)}
          </p>
          <p className="mt-1 break-words text-sm leading-6 text-subtle-foreground">
            {claimDisplayValue(claim)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Badge tone={kindTone(claim.kind)}>{labelValue(claim.kind)}</Badge>
          <Badge tone={confidenceTone(claim.confidence)}>
            {labelValue(claim.confidence)} confidence
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-3.5" />
          {claim.evidence.length} evidence reference{claim.evidence.length === 1 ? "" : "s"}
        </span>
      </div>

      <details className="rounded-md border border-border bg-surface/60">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Evidence ({claim.evidence.length})
        </summary>
        <div className="grid gap-3 border-t p-3">
          {claim.evidence.length === 0 ? (
            <p className="text-xs text-muted-foreground">No evidence references.</p>
          ) : (
            <ul className="grid gap-2">
              {claim.evidence.map((evidence, index) => (
                <li
                  key={`${evidence.kind}:${evidenceReference(evidence)}:${index}`}
                  className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border bg-background/50 px-3 py-2 text-xs"
                >
                  <Badge tone="muted">{labelValue(evidence.kind)}</Badge>
                  <span
                    className="min-w-0 break-all font-mono text-muted-foreground"
                    title={evidenceReference(evidence)}
                  >
                    {evidenceReference(evidence)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="rounded-md border border-border bg-surface/60">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Raw claim
        </summary>
        <div className="border-t p-3">
          <pre className="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-6">
            {JSON.stringify(claim.value, null, 2)}
          </pre>
        </div>
      </details>
    </article>
  );
}

function ShortValue({ value }: { value: string }) {
  return (
    <span className="break-all font-mono text-xs text-subtle-foreground" title={value}>
      {value}
    </span>
  );
}
