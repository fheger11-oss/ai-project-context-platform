import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type RepositoryStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function RepositoryState({ action, description, title }: RepositoryStateProps) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-md border bg-card/60 px-6 py-10 text-center">
      <div className="max-w-md">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function RepositoryErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <RepositoryState
      title="Repositories unavailable"
      description="The repository service could not complete the request."
      action={
        onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null
      }
    />
  );
}
