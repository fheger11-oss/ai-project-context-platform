import { Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RepositoryAutomationStatus } from "@ai-context/contracts";

type AutomaticUpdates = RepositoryAutomationStatus["automaticUpdates"];
type PanelTone = "empty" | "error" | "loading" | "neutral" | "success" | "warning";
type BadgeTone = "error" | "muted" | "running" | "success" | "unavailable" | "warning";

type AutomaticUpdatesPresentation = {
  actionLabel: string | null;
  description: string;
  label: string;
  badgeTone: BadgeTone;
  tone: PanelTone;
};

export type AutomaticUpdatesPanelProps = {
  error: unknown;
  disableError: unknown;
  isDisabling: boolean;
  isLoading: boolean;
  isReconciling: boolean;
  isRetryingStatus: boolean;
  onReconcile: () => void;
  onDisable: (onSuccess: () => void) => void;
  onRetryStatus: () => void;
  reconcileError: unknown;
  status: RepositoryAutomationStatus | undefined;
};

export function AutomaticUpdatesPanel({
  disableError,
  error,
  isDisabling,
  isLoading,
  isReconciling,
  isRetryingStatus,
  onDisable,
  onReconcile,
  onRetryStatus,
  reconcileError,
  status
}: AutomaticUpdatesPanelProps) {
  const automaticUpdates = status?.automaticUpdates;
  const [disableConfirmationOpen, setDisableConfirmationOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automatic Updates</CardTitle>
        <CardDescription>Update behavior verified by Ctxaro.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <StatePanel
            className="p-3"
            description="Checking the repository's automatic-update status."
            title="Checking automatic updates"
            tone="loading"
          />
        ) : error ? (
          <StatePanel
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRetryingStatus}
                aria-busy={isRetryingStatus}
                onClick={onRetryStatus}
              >
                <RefreshCw className={isRetryingStatus ? "animate-spin" : undefined} />
                {isRetryingStatus ? "Rechecking" : "Retry"}
              </Button>
            }
            className="p-3"
            description="Ctxaro couldn't load the automatic-update status. Please try again."
            title="Automatic updates unavailable"
            tone="error"
          />
        ) : automaticUpdates ? (
          <div className="grid gap-2">
            <AutomaticUpdatesStatus
              automaticUpdates={automaticUpdates}
              isDisabling={isDisabling}
              isReconciling={isReconciling}
              onRequestDisable={() => setDisableConfirmationOpen(true)}
              onRetryDisable={() => onDisable(() => setDisableConfirmationOpen(false))}
              onReconcile={onReconcile}
            />
            {reconcileError ? (
              <p className="text-xs leading-5 text-destructive" role="alert">
                Ctxaro couldn't update the automatic-update configuration. Please try again.
              </p>
            ) : null}
          </div>
        ) : (
          <StatePanel
            className="p-3"
            description="No automatic-update status was returned for this repository."
            title="Automatic updates unavailable"
            tone="empty"
          />
        )}
      </CardContent>
      <DisableAutomaticUpdatesDialog
        error={disableError}
        isPending={isDisabling}
        open={disableConfirmationOpen && automaticUpdates?.enabled === true}
        onCancel={() => setDisableConfirmationOpen(false)}
        onConfirm={() => onDisable(() => setDisableConfirmationOpen(false))}
      />
    </Card>
  );
}

function AutomaticUpdatesStatus({
  automaticUpdates,
  isDisabling,
  isReconciling,
  onRequestDisable,
  onRetryDisable,
  onReconcile
}: {
  automaticUpdates: AutomaticUpdates;
  isDisabling: boolean;
  isReconciling: boolean;
  onRequestDisable: () => void;
  onRetryDisable: () => void;
  onReconcile: () => void;
}) {
  const presentation = automaticUpdatesPresentation(automaticUpdates);

  const disableAction = automaticUpdates.enabled ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isDisabling}
      aria-busy={isDisabling}
      onClick={onRequestDisable}
    >
      {isDisabling ? <Loader2 className="animate-spin" /> : <Trash2 />}
      {isDisabling ? "Disabling" : "Disable automatic updates"}
    </Button>
  ) : null;
  const cleanupAction =
    automaticUpdates.configuration === "CLEANUP_PENDING" ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isDisabling}
        aria-busy={isDisabling}
        onClick={onRetryDisable}
      >
        <RefreshCw className={isDisabling ? "animate-spin" : undefined} />
        {isDisabling ? "Retrying cleanup" : "Retry cleanup"}
      </Button>
    ) : null;

  return (
    <StatePanel
      action={
        disableAction ??
        cleanupAction ??
        (presentation.actionLabel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isReconciling}
            aria-busy={isReconciling}
            onClick={onReconcile}
          >
            <RefreshCw className={isReconciling ? "animate-spin" : undefined} />
            {isReconciling ? "Rechecking" : presentation.actionLabel}
          </Button>
        ) : undefined)
      }
      className="p-3"
      description={presentation.description}
      title={<Badge tone={presentation.badgeTone}>{presentation.label}</Badge>}
      tone={presentation.tone}
    />
  );
}

export function DisableAutomaticUpdatesDialog({
  error,
  isPending,
  onCancel,
  onConfirm,
  open
}: {
  error: unknown;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-background/72 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-md border border-border bg-surface p-4 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-5"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 grid size-10 place-items-center rounded-md border border-warning/25 bg-warning/10 text-warning">
              <Trash2 className="size-5" aria-hidden="true" />
            </div>
            <h2 id={titleId} className="text-lg font-semibold">
              Disable automatic updates?
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">
              Ctxaro will stop automatically updating this repository when changes are pushed to
              GitHub. The repository will remain connected, and you can enable automatic updates
              again later.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            disabled={isPending}
            onClick={onCancel}
          >
            <X />
          </Button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            Ctxaro couldn't disable automatic updates. Please try again.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            aria-busy={isPending}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {isPending ? "Disabling" : "Disable automatic updates"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function automaticUpdatesPresentation(
  automaticUpdates: AutomaticUpdates
): AutomaticUpdatesPresentation {
  if (automaticUpdates.enabled === true) {
    return {
      actionLabel: null,
      badgeTone: "success",
      description: "Your repository is automatically updated when changes are pushed to GitHub.",
      label: "Enabled",
      tone: "success"
    };
  }

  if (automaticUpdates.capability === "CANNOT_MANAGE_WEBHOOK") {
    return {
      actionLabel: null,
      badgeTone: "warning",
      description:
        "Automatic updates require repository administrator access from the connected GitHub account.",
      label: "Admin approval required",
      tone: "warning"
    };
  }

  if (automaticUpdates.capability === "PROVIDER_ACCESS_DENIED") {
    return {
      actionLabel: null,
      badgeTone: "error",
      description: "GitHub access for this repository is unavailable or has been denied.",
      label: "GitHub access unavailable",
      tone: "error"
    };
  }

  if (automaticUpdates.capability === "PROVIDER_REPOSITORY_NOT_FOUND") {
    return {
      actionLabel: null,
      badgeTone: "unavailable",
      description: "This repository could not be found or is no longer accessible in GitHub.",
      label: "Repository unavailable",
      tone: "neutral"
    };
  }

  if (automaticUpdates.capability === "PROVIDER_AUTHORIZATION_REQUIRED") {
    return {
      actionLabel: null,
      badgeTone: "warning",
      description: "Reconnect your GitHub account to restore access for automatic updates.",
      label: "GitHub authorization required",
      tone: "warning"
    };
  }

  if (automaticUpdates.capability === "PROVIDER_UNAVAILABLE") {
    return {
      actionLabel: "Retry",
      badgeTone: "unavailable",
      description:
        "GitHub is temporarily unavailable. Automatic updates cannot be verified right now.",
      label: "Temporarily unavailable",
      tone: "neutral"
    };
  }

  switch (automaticUpdates.configuration) {
    case "ENABLED":
      return {
        actionLabel: "Recheck",
        badgeTone: "warning",
        description: "Ctxaro could not verify that automatic updates are enabled.",
        label: "Not enabled",
        tone: "warning"
      };
    case "REQUIRES_ADMIN":
      return {
        actionLabel: null,
        badgeTone: "warning",
        description:
          "GitHub repository administrator access is required to enable automatic updates.",
        label: "Admin approval required",
        tone: "warning"
      };
    case "REQUIRES_AUTHORIZATION":
      return {
        actionLabel: null,
        badgeTone: "warning",
        description: "Reconnect your GitHub account to restore access for automatic updates.",
        label: "GitHub authorization required",
        tone: "warning"
      };
    case "UNAVAILABLE":
      return {
        actionLabel: "Retry",
        badgeTone: "unavailable",
        description: "Automatic updates are temporarily unavailable. Please try again.",
        label: "Temporarily unavailable",
        tone: "neutral"
      };
    case "FAILED":
      return {
        actionLabel: "Retry",
        badgeTone: "error",
        description: "Ctxaro couldn't enable automatic updates. Please try again.",
        label: "Setup failed",
        tone: "error"
      };
    case "CLEANUP_PENDING":
      return {
        actionLabel: "Recheck",
        badgeTone: "warning",
        description: "Cleanup is pending while Ctxaro resolves the repository automation state.",
        label: "Cleanup pending",
        tone: "warning"
      };
    case "PROVISIONING":
      return {
        actionLabel: null,
        badgeTone: "running",
        description: "Ctxaro is configuring automatic updates for this repository.",
        label: "Provisioning",
        tone: "loading"
      };
    case "NOT_CONFIGURED":
      return {
        actionLabel: "Enable automatic updates",
        badgeTone: "muted",
        description: "Automatic updates are not currently configured for this repository.",
        label: "Not configured",
        tone: "neutral"
      };
  }
}
