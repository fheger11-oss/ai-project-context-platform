import { AlertCircle } from "lucide-react";

import type { UserFacingError } from "@/lib/api-error";

export function ErrorNotice({ error }: { error: UserFacingError }) {
  return (
    <div className="rounded-md border border-destructive/35 bg-destructive/10 p-3" role="alert">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="text-sm font-medium text-destructive">{error.title}</p>
          <p className="text-xs leading-5 text-subtle-foreground">{error.message}</p>
        </div>
      </div>
    </div>
  );
}
