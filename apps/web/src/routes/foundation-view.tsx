import { ArrowRight, CheckCircle2, Code2, Layers3, Route, ShieldCheck } from "lucide-react";

import { PageHeading } from "@/components/typography/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const foundations = [
  { label: "React Router", detail: "Route tree and app shell are separated.", icon: Route },
  { label: "TanStack Query", detail: "Server state provider is ready.", icon: Layers3 },
  { label: "Zustand", detail: "Local layout state has a focused store.", icon: Code2 },
  { label: "Auth-ready", detail: "Providers and form primitives are in place.", icon: ShieldCheck }
];

export function FoundationView() {
  return (
    <>
      <PageHeading
        eyebrow="Phase 0.2"
        title="Frontend architecture foundation"
        description="A dark-first application shell with reusable primitives, routing, state boundaries, and design tokens prepared for authentication and future AI engines."
        actions={
          <Button type="button" variant="outline">
            Architecture
            <ArrowRight />
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {foundations.map((item) => (
          <div key={item.label} className="rounded-md border bg-card/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-secondary text-primary">
                <item.icon className="size-4" />
              </div>
              <CheckCircle2 className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-medium text-foreground">{item.label}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-md border bg-card/60">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">System readiness</h2>
            <Badge tone="success">Ready</Badge>
          </div>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3">
          {["Theme tokens", "Shared components", "Layout primitives"].map((item) => (
            <div key={item} className="bg-card/95 p-4">
              <p className="text-sm font-medium">{item}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stable base for the next implementation phase.
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
