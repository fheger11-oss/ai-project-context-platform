import { ArrowDown, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { FinalPipeline } from "@/features/landing/components/final-pipeline";

export function FinalCtaSection() {
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
      { rootMargin: "-10% 0px -16% 0px", threshold: 0.18 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [active]);

  return (
    <section
      ref={sectionRef}
      id="final-cta"
      className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 md:pb-28 lg:px-8"
      aria-labelledby="final-cta-title"
      data-final-active={active ? "true" : "false"}
    >
      <div className="landing-final-glow absolute left-1/2 top-14 -z-10 h-[32rem] w-[48rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-3xl" />
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.36)] sm:p-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10 lg:p-8">
        <div className="relative z-10">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
            Ready to see your codebase differently?
          </p>
          <h2
            id="final-cta-title"
            className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            Turn your repository into context.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            Connect a GitHub repository and let Ctxaro turn its structure into reusable project
            context, documentation, and AI-ready exports.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="landing-final-button h-11 px-5">
              <a href={githubLoginUrl}>
                Explore your repository
                <ArrowRight />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 border-white/12 bg-white/[0.03] px-5 text-subtle-foreground hover:bg-white/[0.06] hover:text-white"
            >
              <a href="#how-it-works">
                See how it works
                <ArrowDown />
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-10 lg:mt-0">
          <FinalPipeline />
        </div>
      </div>
    </section>
  );
}
