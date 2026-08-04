import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRepositoryConnectionStore } from "@/features/repositories/stores/repository-connection-store";

type ConnectionPanelProps = {
  isDisabled?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
};

export function ConnectionPanel({ isDisabled, onSubmit, submitLabel }: ConnectionPanelProps) {
  const apiAccessToken = useRepositoryConnectionStore((state) => state.apiAccessToken);
  const githubAccessToken = useRepositoryConnectionStore((state) => state.githubAccessToken);
  const setApiAccessToken = useRepositoryConnectionStore((state) => state.setApiAccessToken);
  const setGithubAccessToken = useRepositoryConnectionStore((state) => state.setGithubAccessToken);

  return (
    <form
      className="rounded-md border bg-card/70 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="grid gap-2">
          <Label htmlFor="api-token">API access token</Label>
          <Input
            id="api-token"
            type="password"
            autoComplete="off"
            value={apiAccessToken}
            onChange={(event) => setApiAccessToken(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="github-token">GitHub access token</Label>
          <Input
            id="github-token"
            type="password"
            autoComplete="off"
            value={githubAccessToken}
            onChange={(event) => setGithubAccessToken(event.target.value)}
          />
        </div>
        {submitLabel ? (
          <Button type="submit" disabled={isDisabled}>
            <KeyRound />
            {submitLabel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
