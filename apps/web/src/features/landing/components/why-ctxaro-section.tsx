import { ArrowRight, Bot, Code2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AudienceCard } from "@/features/landing/components/audience-card";
import { ContextTransformation } from "@/features/landing/components/context-transformation";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { WorkflowComparison } from "@/features/landing/components/workflow-comparison";

const audiences = [
  {
    title: "Developers",
    description: "Understand unfamiliar repositories faster.",
    icon: Code2
  },
  {
    title: "Teams",
    description: "Create shared project documentation and context.",
    icon: Users
  },
  {
    title: "AI-assisted developers",
    description:
      "Give AI structured project context instead of repeatedly explaining the codebase.",
    icon: Bot
  }
];

export function WhyCtxaroSection() {
  const githubLoginUrl = getGitHubLoginUrl();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || active) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-12% 0px -18% 0px", threshold: 0.16 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [active]);

  return (
    <section
      ref={sectionRef}
      id="why-ctxaro"
      className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 md:pb-32 lg:px-8"
      aria-labelledby="why-ctxaro-title"
      data-why-active={active ? "true" : "false"}
    >
      <div className="landing-why-glow absolute left-1/2 top-24 -z-10 h-[32rem] w-[46rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-primary/[0.065] blur-3xl" />
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1fr] lg:items-end">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
            Built for real repository work
          </p>
          <h2
            id="why-ctxaro-title"
            className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl"
          >
            Your codebase already contains the context. Ctxaro makes it usable.
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end">
          Instead of repeatedly explaining your project to AI, turn the structure already inside
          your repository into reusable project context.
        </p>
      </div>

      <div className="mt-12">
        <ContextTransformation />
      </div>

      <div className="mt-6">
        <WorkflowComparison />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h3 className="text-xl font-semibold text-white">
            Made for developers working with real codebases.
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {audiences.map((audience) => (
            <AudienceCard
              key={audience.title}
              description={audience.description}
              icon={audience.icon}
              title={audience.title}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-md border border-white/10 bg-[#08100e]/72 p-5 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Move from repository structure to Project Context, then into Documents and AI Export.
        </p>
        <Button asChild className="h-10">
          <a href={githubLoginUrl}>
            Explore your repository
            <ArrowRight />
          </a>
        </Button>
      </div>
    </section>
  );
}
