import {
  ArrowRight,
  Bot,
  Braces,
  FileText,
  GitBranch,
  Layers3,
  Network,
  ScanLine,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CapabilityCard } from "@/features/landing/components/capability-card";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { PipelineStep } from "@/features/landing/components/pipeline/pipeline-step";

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
    description: "Turn those signals into structured knowledge about the project.",
    icon: Braces
  },
  {
    title: "Documents",
    description: "Generate useful Markdown documentation from verified context.",
    icon: FileText
  },
  {
    title: "AI Export",
    description: "Export compact context for the AI tools you already use.",
    icon: Bot
  }
];

const capabilities = [
  {
    label: "Understand",
    title: "Understand the project.",
    description:
      "Ctxaro builds structured understanding from the repository: project identity, technology stack, architecture, modules, dependencies, entry points, testing, and infrastructure context.",
    icon: ShieldCheck
  },
  {
    label: "Generate",
    title: "Generate useful project knowledge.",
    description:
      "Project Context can become readable Markdown artifacts, including Project Overview, Technical Documentation, Architecture Documentation, Module Documentation, and README output.",
    icon: Layers3
  },
  {
    label: "Export",
    title: "Give AI the context it needs.",
    description:
      "Export selected Project Context as AI Context, Markdown, or Plain Text, with preview, copy, and download workflows available in the MVP.",
    icon: Sparkles
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
              Turn your codebase into context AI can actually use.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end">
            Ctxaro reads your repository, understands its structure, and turns what it finds into
            structured project context, documentation, and AI-ready exports.
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
            Start with the repository you already have. Ctxaro turns it into context your team and
            AI coding tools can reuse.
          </p>
          <Button asChild className="h-10">
            <a href={githubLoginUrl}>
              Start with your repository
              <ArrowRight />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
