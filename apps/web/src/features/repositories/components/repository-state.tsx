import type { ReactNode } from "react";

import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";

type RepositoryStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function RepositoryState({ action, description, title }: RepositoryStateProps) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-md border border-dashed bg-card/60 px-6 py-10 text-center">
      <StatePanel
        action={action}
        className="w-full max-w-md border-none bg-transparent p-0"
        description={description}
        title={title}
        tone="empty"
      />
    </div>
  );
}

export function RepositoryErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <RepositoryState
      title="Repositories unavailable"
      description="Connected repositories could not be loaded."
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
