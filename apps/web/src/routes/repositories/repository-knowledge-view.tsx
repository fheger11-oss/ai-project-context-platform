import { useParams } from "react-router-dom";
import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { ProjectKnowledgePanel } from "@/features/project-knowledge/components/project-knowledge-panel";

export function RepositoryKnowledgeView() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const repositoryId = id?.trim() ?? "";
  if (!accessToken)
    return (
      <StatePanel
        title="Session required"
        description="Sign in with GitHub to view project knowledge."
        tone="empty"
        action={
          <Button asChild>
            <a href={getGitHubLoginUrl()}>Sign in with GitHub</a>
          </Button>
        }
      />
    );
  if (!repositoryId)
    return (
      <StatePanel
        title="Repository not found"
        description="A repository identifier is required to load project knowledge."
        tone="error"
      />
    );
  return (
    <ProjectKnowledgePanel
      key={repositoryId}
      accessToken={accessToken}
      repositoryId={repositoryId}
    />
  );
}
