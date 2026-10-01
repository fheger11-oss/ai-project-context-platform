import { useParams } from "react-router-dom";

import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { ArchitectureHistoryPanel } from "@/features/architecture-history/components/architecture-history-panel";
import { analytics } from "@/lib/analytics";

export function RepositoryArchitectureHistoryView() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const repositoryId = id?.trim() ?? "";

  if (!accessToken) {
    return (
      <StatePanel
        action={
          <Button asChild>
            <a
              href={getGitHubLoginUrl()}
              onClick={() => analytics.track("github_login_started", { method: "github" })}
            >
              Sign in with GitHub
            </a>
          </Button>
        }
        className="min-h-[320px]"
        description="Sign in with GitHub to view architecture history."
        title="Session required"
        tone="empty"
      />
    );
  }

  if (!repositoryId) {
    return (
      <StatePanel
        className="min-h-[320px]"
        description="A repository identifier is required to load architecture history."
        title="Repository not found"
        tone="error"
      />
    );
  }

  return (
    <ArchitectureHistoryPanel
      key={repositoryId}
      accessToken={accessToken}
      repositoryId={repositoryId}
    />
  );
}
