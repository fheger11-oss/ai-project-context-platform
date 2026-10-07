import { useParams } from "react-router-dom";

import { StatePanel } from "@/components/shared/state-panel";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { DependencyIntelligencePanel } from "@/features/dependency-intelligence/components/dependency-intelligence-panel";

export function RepositoryDependencyIntelligenceView() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const repositoryId = id?.trim() ?? "";
  if (!accessToken)
    return (
      <StatePanel
        title="Session required"
        description="Sign in to view Dependency Intelligence."
        tone="empty"
      />
    );
  if (!repositoryId)
    return (
      <StatePanel
        title="Repository not found"
        description="A repository identifier is required."
        tone="error"
      />
    );
  return (
    <DependencyIntelligencePanel
      key={repositoryId}
      accessToken={accessToken}
      repositoryId={repositoryId}
    />
  );
}
