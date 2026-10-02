const concepts = [
  {
    id: "project-context-definition",
    title: "Project Context",
    description:
      "Ctxaro's structured representation of a repository's current technical state. It records claims about the project, technologies, structure, architecture, entry points, testing, and infrastructure, with available evidence and confidence."
  },
  {
    id: "project-memory-definition",
    title: "Project Memory",
    description:
      "The persistent project records surrounding the current Project Context. It brings together durable knowledge, decisions, timeline events, and architecture history as the repository changes."
  },
  {
    id: "project-knowledge-definition",
    title: "Project Knowledge",
    description:
      "Stored project facts with lifecycle status and source metadata. Records distinguish user-authored and system-derived knowledge, and can include kind, confidence, verification, and links to a source context or decision."
  },
  {
    id: "project-decisions-definition",
    title: "Project Decisions",
    description:
      "Stored technical choices with their decision, rationale, affected area, status, and effective date. When available, provenance links a decision to a Project Context, repository update, or commit."
  },
  {
    id: "timeline-definition",
    title: "Timeline",
    description:
      "A chronological projection of supported project events: repository connection, repository updates, promoted Project Context versions, and effective Project Decisions."
  },
  {
    id: "architecture-history-definition",
    title: "Architecture History",
    description:
      "A structural comparison between adjacent, compatible Project Context snapshots. It can show added, removed, and modified modules and relationships while suppressing unsupported low-confidence claims."
  }
] as const;

export function ProjectMemorySection() {
  return (
    <section
      id="project-memory"
      className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 md:pb-32 lg:px-8"
      aria-labelledby="project-memory-title"
    >
      <div className="border-t border-white/10 pt-12 md:pt-16">
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
              V3 concepts
            </p>
            <h2
              id="project-memory-title"
              className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl"
            >
              Current context, durable memory.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end">
            Project Context describes the repository at a specific commit. Project Memory preserves
            the supported records and history that remain useful beyond that current snapshot.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {concepts.map((concept) => (
            <article
              key={concept.id}
              className="rounded-lg border border-white/10 bg-[#08100e]/72 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]"
              aria-labelledby={concept.id}
            >
              <h3 id={concept.id} className="text-lg font-semibold text-white">
                {concept.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{concept.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
