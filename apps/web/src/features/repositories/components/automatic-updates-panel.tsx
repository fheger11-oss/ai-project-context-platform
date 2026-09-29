import { RefreshCw } from "lucide-react";

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
  isLoading: boolean;
  isReconciling: boolean;
  isRetryingStatus: boolean;
  onReconcile: () => void;
  onRetryStatus: () => void;
  reconcileError: unknown;
  status: RepositoryAutomationStatus | undefined;
};

export function AutomaticUpdatesPanel({
  error,
  isLoading,
  isReconciling,
  isRetryingStatus,
  onReconcile,
  onRetryStatus,
  reconcileError,
  status
}: AutomaticUpdatesPanelProps) {
  const automaticUpdates = status?.automaticUpdates;

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
              isReconciling={isReconciling}
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
    </Card>
  );
}

function AutomaticUpdatesStatus({
  automaticUpdates,
  isReconciling,
  onReconcile
}: {
  automaticUpdates: AutomaticUpdates;
  isReconciling: boolean;
  onReconcile: () => void;
}) {
  const presentation = automaticUpdatesPresentation(automaticUpdates);

  return (
    <StatePanel
      action={
        presentation.actionLabel ? (
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
        ) : undefined
      }
      className="p-3"
      description={presentation.description}
      title={<Badge tone={presentation.badgeTone}>{presentation.label}</Badge>}
      tone={presentation.tone}
    />
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
