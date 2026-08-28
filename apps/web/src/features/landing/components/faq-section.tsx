import { useState } from "react";

import { FaqItem } from "@/features/landing/components/faq-item";

const faqs = [
  {
    id: "what-is-ctxaro",
    question: "What is Ctxaro?",
    answer:
      "Ctxaro analyzes a connected repository and turns its discovered project structure into structured Project Context, documentation, and AI-ready exports."
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
    id: "ai-model-repository",
    question: "Does Ctxaro send my repository directly to an AI model?",
    answer:
      "Ctxaro currently creates structured project context and AI-ready exports. The core repository analysis and document generation flow is implemented in the app; AI Export packages the resulting context rather than acting as a chatbot."
  },
  {
    id: "who-is-ctxaro-for",
    question: "Who is Ctxaro for?",
    answer:
      "Ctxaro is for developers, teams, AI-assisted developers, and people working with unfamiliar or complex repositories who need reusable project understanding."
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
