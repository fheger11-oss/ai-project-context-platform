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
      "Project Memory is the durable layer around Project Context. It retains explicit project knowledge, decisions, timeline events, and architecture history so important information is not limited to one analysis snapshot."
  },
  {
    id: "project-context-and-memory",
    question: "How is Project Memory different from Project Context?",
    answer:
      "Project Context describes what the repository looks like now. Project Memory preserves what the project should retain over time, including durable knowledge, decisions, activity, and architectural evolution."
  },
  {
    id: "what-does-ctxaro-analyze",
    question: "What does Ctxaro analyze?",
    answer:
      "Ctxaro works with project structure, technologies, dependencies, architecture signals, modules, entry points, testing and infrastructure context, plus evidence and confidence on generated context claims."
  },
  {
    id: "what-does-ctxaro-generate",
    question: "What does Ctxaro generate?",
    answer:
      "Ctxaro generates Project Context, Project Overview, Technical Documentation, Architecture Documentation, Module Documentation, README, and AI Export outputs in AI Context, Markdown, and Plain Text formats."
  },
  {
    id: "retained-information",
    question: "What information does Ctxaro retain?",
    answer:
      "Ctxaro retains generated Project Context snapshots and the durable project knowledge, decisions, timeline events, and architecture history associated with a connected repository."
  },
  {
    id: "coding-assistant",
    question: "Does Ctxaro replace a coding assistant?",
    answer:
      "No. Ctxaro is a repository understanding and Project Memory platform, not a chatbot or coding agent. AI Export can package selected Project Context for tools you already use."
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
