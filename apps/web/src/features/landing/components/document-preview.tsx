import { FileText } from "lucide-react";

const documentLines = [
  "# Project Overview",
  "## Technology Stack",
  "TypeScript · React · Node.js",
  "## Architecture",
  "Modular monorepo with web and API apps",
  "## Modules",
  "Authentication · Repository · Analysis · Context"
];

export function DocumentPreview() {
  return (
    <article className="landing-proof-panel relative h-full overflow-hidden rounded-lg border border-white/10 bg-[#08100e]/92 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Documents</p>
          <h3 className="mt-2 text-base font-semibold text-white">Generated Markdown</h3>
        </div>
        <div className="grid size-9 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <FileText className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["Project Overview", "Architecture Documentation", "README"].map((type) => (
          <span
            key={type}
            className="rounded-sm border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            {type}
          </span>
        ))}
      </div>

      <div className="rounded-md border border-white/10 bg-black/24 p-3 font-mono text-[11px] leading-6">
        {documentLines.map((line, index) => (
          <p
            key={line}
            className="landing-document-line text-muted-foreground"
            style={{ animationDelay: `${index * 260}ms` }}
          >
            <span className={line.startsWith("#") ? "text-subtle-foreground" : undefined}>
              {line}
            </span>
          </p>
        ))}
        <span className="landing-document-caret mt-1 inline-block h-4 w-1 bg-primary align-middle" />
      </div>
    </article>
  );
}
