import { ArrowDown, ArrowRight, GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { HeroVisualization } from "@/features/landing/components/hero-visualization";

export function HeroSection() {
  const githubLoginUrl = getGitHubLoginUrl();

  return (
    <section className="relative mx-auto grid min-h-[calc(100svh-4rem)] w-screen max-w-[100vw] items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:w-full lg:max-w-7xl lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div className="landing-hero-copy relative z-10 min-w-0 sm:max-w-2xl">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
          Understand your codebase
        </p>
        <h1 className="mt-5 max-w-[12.5ch] text-5xl font-semibold leading-[0.95] text-white sm:text-6xl lg:text-7xl">
          Turn your codebase into context AI can use.
        </h1>
        <p className="landing-mobile-measure mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
          Ctxaro connects to a GitHub repository, scans the project, builds structured Project
          Context, generates useful documents, and exports AI-ready context for coding tools.
        </p>

        <div className="landing-mobile-measure mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 px-5 sm:w-auto">
            <a href={githubLoginUrl}>
              <GitBranch />
              Start for free
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 border-white/12 bg-white/[0.03] px-5 text-subtle-foreground hover:bg-white/[0.06] hover:text-white sm:w-auto"
          >
            <a href="#how-it-works">
              See how it works
              <ArrowDown />
            </a>
          </Button>
        </div>

        <div className="landing-mobile-measure mt-7 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2">
            <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_18px_rgba(69,211,154,0.75)]" />
            <span className="min-w-0">Repository understanding, not chatbot sprawl</span>
          </span>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-md px-1 py-2 text-subtle-foreground outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050706]"
          >
            Open dashboard
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>

      <HeroVisualization />
    </section>
  );
}
