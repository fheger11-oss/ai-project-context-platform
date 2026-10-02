import { ArrowRight, CheckCircle2, History, RefreshCw } from "lucide-react";

const outcomes = [
  {
    title: "Changes can trigger updates",
    description:
      "When Automatic Updates are enabled, a push to the connected repository's default branch can start context update processing.",
    icon: RefreshCw
  },
  {
    title: "Current means verified",
    description:
      "A new Project Context is promoted only after its scan, analysis, repository, and commit provenance match.",
    icon: CheckCircle2
  },
  {
    title: "Previous versions remain available",
    description:
      "Context history is preserved, and an unsuccessful update does not replace the previous valid Project Context.",
    icon: History
  }
];

export function ContinuousContextSection() {
  return (
    <section
      id="continuous-context"
      className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 md:pb-28 lg:px-8"
      aria-labelledby="continuous-context-title"
    >
      <div className="grid gap-8 border-t border-white/10 pt-12 md:pt-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
            What changed in V2
          </p>
          <h2
            id="continuous-context-title"
            className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl"
          >
            From Project Context to Continuous Project Context.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            Ctxaro still scans and analyzes a repository to build Project Context. V2 adds the
            update path that can maintain that context as the connected repository changes.
          </p>

          <div className="mt-8 grid gap-3">
            {outcomes.map(({ description, icon: Icon, title }) => (
              <article
                key={title}
                className="flex gap-3 rounded-md border border-white/10 bg-white/[0.022] p-4"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/[0.07] text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </article>
            ))}
          </div>

          <a
            href="#how-it-works"
            className="mt-7 inline-flex items-center gap-2 rounded-md text-sm font-medium text-primary outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-4 focus-visible:ring-offset-[#050706]"
          >
            See the update flow
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#07100d] shadow-[0_24px_90px_rgba(0,0,0,0.32)]">
          <img
            src="/brand/social/ctxaro-v2-campaign-01.svg"
            alt="Ctxaro V1 creates Project Context from repository analysis. Ctxaro V2 processes connected repository changes, validates a new current Project Context, reports freshness, and preserves previous versions."
            className="h-auto w-full"
            loading="lazy"
            decoding="async"
          />
          <figcaption className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-muted-foreground">
            V2 extends the existing deterministic repository analysis and Project Context flow.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
