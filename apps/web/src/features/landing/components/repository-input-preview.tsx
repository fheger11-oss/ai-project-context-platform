import { FileCode2, FolderGit2 } from "lucide-react";

const fileRows = [
  "apps/web/src/routes",
  "apps/api/src/modules",
  "features/context",
  "features/documents",
  "features/ai-export",
  "prisma/schema.prisma",
  "package.json",
  "README.md"
];

export function RepositoryInputPreview() {
  return (
    <article className="landing-why-panel relative h-full overflow-hidden rounded-lg border border-white/10 bg-[#07100d]/90 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="landing-repo-scan absolute left-0 top-20 h-24 w-px bg-gradient-to-b from-transparent via-primary to-transparent" />
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Raw repository
          </p>
          <h3 className="mt-2 text-base font-semibold text-white">Files, modules, config</h3>
        </div>
        <div className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-primary">
          <FolderGit2 className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-2">
        {fileRows.map((row, index) => (
          <div
            key={row}
            className="landing-repo-row flex items-center gap-2 rounded-sm border border-white/8 bg-white/[0.025] px-2.5 py-2 font-mono text-[11px] text-muted-foreground"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{row}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
        {[
          "Where is this logic?",
          "What does this module do?",
          "How does this project fit together?"
        ].map((question) => (
          <span key={question} className="rounded-sm border border-white/8 bg-black/18 px-2 py-1.5">
            {question}
          </span>
        ))}
      </div>
    </article>
  );
}
