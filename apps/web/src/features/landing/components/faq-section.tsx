import { useState } from "react";

import { FaqItem } from "@/features/landing/components/faq-item";

const faqs = [
  {
    id: "what-is-ctxaro",
    question: "What is Ctxaro?",
    answer:
      "Ctxaro helps developers understand a connected repository and build structured Project Context. Project Memory preserves that context with project knowledge, decisions, timeline events, and architecture history as the project evolves."
  },
  {
    id: "project-context",
    question: "What is Project Context?",
    answer:
      "Project Context is Ctxaro's structured representation of the repository's current technical state, including its identity, technologies, architecture, modules, dependencies, entry points, testing, and infrastructure context."
  },
  {
    id: "project-memory",
    question: "What is Project Memory?",
    answer:
      "Project Memory is the persistent layer around the current Project Context. It brings together durable project knowledge, decisions, timeline events, and architecture history so supported information is not limited to one repository snapshot."
  },
  {
    id: "project-context-and-memory",
    question: "How is Project Memory different from Project Context?",
    answer:
      "Project Context describes what the repository looks like now. Project Memory preserves what the project should retain over time, including durable knowledge, decisions, activity, and architectural evolution."
  },
  {
    id: "project-knowledge",
    question: "What is Project Knowledge?",
    answer:
      "Project Knowledge consists of stored project facts with lifecycle status and source metadata. A record identifies whether it is user-authored or system-derived, distinguishes asserted, observed, and inferred knowledge, and can include confidence, verification, and links to a source Project Context or Project Decision."
  },
  {
    id: "project-decisions",
    question: "What are Project Decisions?",
    answer:
      "Project Decisions are stored technical choices with a title, decision, rationale, affected area, lifecycle status, and effective date. When available, their provenance links them to a Project Context, repository update, or commit."
  },
  {
    id: "timeline",
    question: "What is the Timeline in Ctxaro?",
    answer:
      "Timeline is a chronological view of supported project events. It includes repository connection, repository updates, promoted Project Context versions, and the effective dates of Project Decisions."
  },
  {
    id: "architecture-history",
    question: "What is Architecture History?",
    answer:
      "Architecture History compares the structural architecture in adjacent, compatible promoted Project Context snapshots. It can identify added, removed, and modified modules and relationships, while compatibility checks and confidence thresholds prevent unsupported comparisons."
  },
  {
    id: "coding-assistant",
    question: "Is Ctxaro an AI coding agent?",
    answer:
      "No. Ctxaro is a repository understanding and Project Memory application, not a chatbot or coding agent. It does not modify repository source code. AI Export can package selected Project Context for external tools you already use."
  },
  {
    id: "modify-code",
    question: "Does Ctxaro modify my code?",
    answer:
      "No. Ctxaro scans and analyzes a connected repository to build context and memory; it does not edit the repository's source code."
  },
  {
    id: "repository-understanding",
    question: "How does Ctxaro understand a repository?",
    answer:
      "Ctxaro scans a consistent repository snapshot and analyzes project structure, technologies, dependencies, modules, entry points, testing, infrastructure, and other supported technical signals."
  },
  {
    id: "documents-and-export",
    question: "What can Ctxaro generate and export?",
    answer:
      "From a selected Project Context, Ctxaro can generate Markdown project overviews, technical documentation, architecture documents, module documentation, and README files. AI Export packages context in AI Context, Markdown, or Plain Text format for external workflows."
  },
  {
    id: "using-context",
    question: "What can I use the resulting context for?",
    answer:
      "You can inspect structured Project Context, generate supported Markdown documentation, and export selected context in AI Context, Markdown, or Plain Text formats for external development workflows."
  }
];

export function FaqSection() {
  const [openId, setOpenId] = useState(faqs[0]?.id ?? "");

  return (
    <section
      id="faq"
      className="relative mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 md:pb-28 lg:px-8"
      aria-labelledby="faq-title"
    >
      <div className="mb-8">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-primary">
          Common questions
        </p>
        <h2
          id="faq-title"
          className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl"
        >
          A clearer way to work with repository context.
        </h2>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#08100e]/72 shadow-[0_18px_70px_rgba(0,0,0,0.24)]">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="px-4 sm:px-6">
          {faqs.map((faq, index) => (
            <FaqItem
              key={faq.id}
              answer={faq.answer}
              id={faq.id}
              index={index}
              isOpen={openId === faq.id}
              question={faq.question}
              onToggle={() => setOpenId((current) => (current === faq.id ? "" : faq.id))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
