import type { LucideIcon } from "lucide-react";

type AudienceCardProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function AudienceCard({ description, icon: Icon, title }: AudienceCardProps) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4 grid size-9 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}
