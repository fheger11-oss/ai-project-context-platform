import {
  ArrowRight,
  Braces,
  GitBranch,
  History,
  Network,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Workflow
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CapabilityCard } from "@/features/landing/components/capability-card";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { PipelineStep } from "@/features/landing/components/pipeline/pipeline-step";
import { analytics } from "@/lib/analytics";

const pipelineSteps = [
  {
    title: "Repository",
    description: "Connect the GitHub repository you want Ctxaro to understand.",
    icon: GitBranch
  },
  {
    title: "Scan",
    description: "Capture the repository as a consistent project snapshot.",
    icon: ScanLine
  },
  {
    title: "Analysis",
    description: "Extract structure, technologies, dependencies, and project signals.",
    icon: Network
  },
  {
    title: "Project Context",
    description: "Create structured context tied to the analyzed repository commit.",
    icon: Braces
  },
  {
    title: "Repository Changes",
    description: "Detect a new default-branch state through GitHub when updates are enabled.",
    icon: RefreshCw
  },
  {
    title: "Current Context",
    description: "Promote a new Project Context only after its provenance is validated.",
    icon: ShieldCheck
  }
];

const capabilities = [
  {
    label: "Analyze",
    title: "Build context from repository evidence.",
    description:
      "Ctxaro builds structured understanding from the repository: project identity, technology stack, architecture, modules, dependencies, entry points, testing, and infrastructure context.",
    icon: Network
  },
  {
    label: "Maintain",
    title: "Process changes without starting from an empty picture.",
    description:
      "Eligible updates reuse unchanged source structures while changed source is parsed again. The complete target snapshot still drives repository-wide analysis.",
    icon: Workflow
  },
  {
    label: "Preserve",
    title: "Keep the last valid context available.",
    description:
      "Ctxaro keeps context history and promotes a new current version only after validation. If an update fails, the previous context remains available.",
    icon: History
  }
];

export function HowItWorksSection() {
  const githubLoginUrl = getGitHubLoginUrl();

  return (
    <section
      id="how-it-works"
      className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 md:pb-28 lg:px-8"
      aria-labelledby="how-it-works-title"
    >
      <div className="landing-section-glow absolute left-1/2 top-16 -z-10 h-[28rem] w-[42rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="border-t border-white/10 pt-12 md:pt-16">
        <div className="grid gap-5 lg:grid-cols-[0.74fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
              How Ctxaro works
            </p>
            <h2
              id="how-it-works-title"
              className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl"
            >
              Analyze once. Keep Project Context current as the repository evolves.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end">
            A connected repository is scanned and analyzed at a specific commit. When Automatic
            Updates are enabled, later default-branch pushes can trigger the same verified path for
            a new repository state.
          </p>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-lg border border-white/10 bg-white/[0.018] p-3 shadow-[0_22px_80px_rgba(0,0,0,0.26)] md:p-5">
          <div className="landing-pipeline-sheen absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <ol className="relative grid gap-8 md:grid-cols-3 xl:grid-cols-6 xl:gap-6">
            {pipelineSteps.map((step, index) => (
              <PipelineStep
                key={step.title}
                description={step.description}
                icon={step.icon}
                index={index}
                isLast={index === pipelineSteps.length - 1}
                title={step.title}
              />
            ))}
          </ol>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <CapabilityCard
              key={capability.label}
              description={capability.description}
              icon={capability.icon}
              label={capability.label}
              title={capability.title}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-md border border-white/10 bg-[#08100e]/72 p-5 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Freshness shows whether the current Project Context matches the latest GitHub commit
            Ctxaro has verified.
          </p>
          <Button asChild className="h-10">
            <a
              href={githubLoginUrl}
              onClick={() => analytics.track("github_login_started", { method: "github" })}
            >
              Connect your repository
              <ArrowRight />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
