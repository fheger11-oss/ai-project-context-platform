import { Bot, Braces, CheckCircle2, FileCode2, FileText, GitBranch, ScanLine } from "lucide-react";

const files = ["src/routes", "features/context", "analysis-engine.ts", "docs/generated.md"];
const contextItems = ["architecture", "workflows", "module map", "AI context"];

export function HeroVisualization() {
  return (
    <div
      className="landing-mobile-visual relative mx-0 min-w-0 max-w-[36rem] sm:mx-auto lg:mx-0"
      aria-hidden="true"
    >
      <div className="landing-orbit absolute -inset-7 rounded-[2rem] border border-primary/10" />
      <div className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#07100d]/88 shadow-[0_24px_90px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-xl">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-subtle-foreground">
            <GitBranch className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">github.com/team/product-api</span>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 text-[11px] text-primary sm:flex">
            <span className="landing-live-dot size-1.5 rounded-full bg-primary" />
            Understanding repository
          </div>
        </div>

        <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-[0.82fr_1fr] sm:p-5">
          <div className="grid min-w-0 gap-3">
            <section className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase text-muted-foreground">
                  <FileCode2 className="size-3.5" />
                  Repository
                </div>
                <span className="rounded-sm border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  synced
                </span>
              </div>
              <div className="grid gap-2">
                {files.map((file, index) => (
                  <div
                    key={file}
                    className="flex min-w-0 items-center gap-2 text-xs text-subtle-foreground"
                  >
                    <span className="h-px w-3 shrink-0 bg-white/16" />
                    <span
                      className={index === 2 ? "min-w-0 truncate text-white" : "min-w-0 truncate"}
                    >
                      {file}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded-md border border-primary/20 bg-primary/[0.045] p-3">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase text-primary">
                <ScanLine className="size-3.5" />
                Scan activity
              </div>
              <div className="landing-scan-track relative h-2 overflow-hidden rounded-full bg-white/8">
                <span className="landing-scan-beam absolute inset-y-0 w-1/3 rounded-full bg-primary/80" />
              </div>
              <p className="mt-3 font-mono text-[11px] leading-5 text-muted-foreground">
                map imports -&gt; detect modules -&gt; extract intent
              </p>
            </section>
          </div>

          <div className="relative grid min-w-0 gap-3">
            <div className="landing-connector absolute left-4 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-primary/70 via-white/12 to-primary/40 sm:block" />

            <section className="relative min-w-0 rounded-md border border-white/10 bg-[#0b1210]/90 p-3">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase text-muted-foreground">
                <Braces className="size-3.5 text-primary" />
                Project Context
              </div>
              <div className="grid grid-cols-2 gap-2">
                {contextItems.map((item, index) => (
                  <div
                    key={item}
                    className="min-w-0 rounded-sm border border-white/10 bg-white/[0.035] px-2 py-2 text-[11px] text-subtle-foreground"
                    style={{ animationDelay: `${index * 0.4}s` }}
                  >
                    <CheckCircle2 className="mb-1 size-3 text-primary" />
                    <span className="block truncate">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative min-w-0 rounded-md border border-white/10 bg-black/24 p-3">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase text-muted-foreground">
                <FileText className="size-3.5 text-primary" />
                Documents
              </div>
              <div className="space-y-2 font-mono text-[11px] leading-5 text-muted-foreground">
                <p className="text-subtle-foreground"># Architecture overview</p>
                <p>Auth, repository sync, scan history, analysis output...</p>
              </div>
            </section>

            <section className="relative min-w-0 rounded-md border border-primary/25 bg-primary/[0.055] p-3">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">AI-ready export</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Markdown, plain text, and AI Context outputs prepared from the latest project
                    context.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
