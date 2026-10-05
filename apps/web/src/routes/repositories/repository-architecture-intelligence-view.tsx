import { useParams } from "react-router-dom";

import { StatePanel } from "@/components/shared/state-panel";
import { ArchitectureIntelligencePanel } from "@/features/architecture-intelligence/components/architecture-intelligence-panel";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";

export function RepositoryArchitectureIntelligenceView() {
  const { id } = useParams<{ id: string }>();
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const repositoryId = id?.trim() ?? "";
  if (!accessToken)
    return (
      <StatePanel
        title="Session required"
        description="Sign in to view Architecture Intelligence."
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
    <ArchitectureIntelligencePanel
      key={repositoryId}
      accessToken={accessToken}
      repositoryId={repositoryId}
    />
  );
}
