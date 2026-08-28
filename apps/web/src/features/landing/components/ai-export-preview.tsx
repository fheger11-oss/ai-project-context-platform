import { Bot, ClipboardCopy, Download, Eye } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const formatPreviews = {
  "AI Context": [
    "type: AI_PROJECT_CONTEXT",
    "project: Ctxaro",
    "stack: TypeScript, React, Node.js",
    "modules: auth, repositories, scans, context"
  ],
  Markdown: [
    "# Ctxaro Context",
    "Stack: TypeScript · React · Node.js",
    "Architecture: Modular monorepo",
    "Exports: context for AI coding tools"
  ],
  "Plain Text": [
    "Ctxaro project context",
    "Stack: TypeScript, React, Node.js",
    "Architecture: Modular monorepo",
    "Key modules: auth, repository, analysis, context"
  ]
};

const formats = Object.keys(formatPreviews) as (keyof typeof formatPreviews)[];

export function AiExportPreview() {
  const [selectedFormat, setSelectedFormat] = useState<(typeof formats)[number]>("AI Context");

  return (
    <article className="landing-proof-panel relative h-full overflow-hidden rounded-lg border border-white/10 bg-[#08100e]/92 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="landing-export-pulse absolute right-4 top-16 size-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">AI Export</p>
          <h3 className="mt-2 text-base font-semibold text-white">Compact output</h3>
        </div>
        <div className="grid size-9 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Bot className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div
        role="tablist"
        aria-label="AI export format preview"
        className="mb-4 flex flex-wrap gap-2"
      >
        {formats.map((format) => (
          <button
            key={format}
            type="button"
            role="tab"
            aria-selected={selectedFormat === format}
            className={cn(
              "rounded-md border px-2.5 py-1.5 font-mono text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08100e]",
              selectedFormat === format
                ? "border-primary/30 bg-primary/12 text-primary"
                : "border-white/10 bg-white/[0.025] text-muted-foreground hover:text-subtle-foreground"
            )}
            onClick={() => setSelectedFormat(format)}
          >
            {format}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-primary/18 bg-primary/[0.035] p-3 font-mono text-[11px] leading-6">
        {formatPreviews[selectedFormat].map((line, index) => (
          <p
            key={`${selectedFormat}:${line}`}
            className="landing-export-line text-subtle-foreground"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            {line}
          </p>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <PreviewAction icon={Eye} label="Preview" />
        <PreviewAction icon={ClipboardCopy} label="Copy" />
        <PreviewAction icon={Download} label="Download" />
      </div>
    </article>
  );
}

function PreviewAction({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2 py-2">
      <Icon className="size-3.5 text-primary" aria-hidden="true" />
      {label}
    </div>
  );
}
