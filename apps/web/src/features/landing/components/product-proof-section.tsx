import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { AiExportPreview } from "@/features/landing/components/ai-export-preview";
import { DocumentPreview } from "@/features/landing/components/document-preview";
import { ProductContextPreview } from "@/features/landing/components/product-context-preview";
import { ProductFlowConnector } from "@/features/landing/components/product-flow-connector";

export function ProductProofSection() {
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
      { rootMargin: "-12% 0px -18% 0px", threshold: 0.18 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [active]);

  return (
    <section
      ref={sectionRef}
      id="product-proof"
      className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 md:pb-32 lg:px-8"
      aria-labelledby="product-proof-title"
      data-active={active ? "true" : "false"}
    >
      <div className="landing-proof-glow absolute left-1/2 top-24 -z-10 h-[30rem] w-[44rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-primary/[0.075] blur-3xl" />
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1fr] lg:items-end">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
            What you get
          </p>
          <h2
            id="product-proof-title"
            className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl"
          >
            From codebase to usable knowledge.
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end">
          Ctxaro turns the structure hidden inside your repository into context you can understand,
          documents you can share, and exports you can give to AI.
        </p>
      </div>

      <div className="mt-12 overflow-hidden rounded-xl border border-white/10 bg-white/[0.018] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.32)] md:p-5 lg:p-6">
        <div className="relative mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl">
            <ProductContextPreview />
          </div>
          <ProductFlowConnector />
          <ProductFlowConnector direction="split" className="hidden md:block" />
          <div className="grid gap-4 md:grid-cols-2">
            <DocumentPreview />
            <AiExportPreview />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-md border border-white/10 bg-[#08100e]/72 p-5 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          See the same pipeline turn repository structure into Project Context, Markdown documents,
          and AI-ready exports.
        </p>
        <Button asChild className="h-10">
          <a href={githubLoginUrl}>
            See what Ctxaro finds
            <ArrowRight />
          </a>
        </Button>
      </div>
    </section>
  );
}
