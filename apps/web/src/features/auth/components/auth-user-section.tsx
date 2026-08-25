import { Loader2, LogIn, LogOut, UserCircle } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatusDot } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getGitHubLoginUrl, logout } from "@/features/auth/api/auth-api";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { cn } from "@/lib/utils";

type AuthUserSectionProps = {
  collapsed?: boolean;
};

export function AuthUserSection({ collapsed = false }: AuthUserSectionProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const refreshToken = useAuthSessionStore((state) => state.refreshToken);
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const isAuthenticated = Boolean(accessToken);
  const currentUserQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => getCurrentUser(accessToken),
    enabled: isAuthenticated,
    retry: false
  });
  const logoutMutation = useMutation({
    mutationFn: () => (refreshToken ? logout(refreshToken) : Promise.resolve()),
    onSettled: async () => {
      clearSession();
      queryClient.clear();
      navigate("/", { replace: true });
    }
  });

  useEffect(() => {
    if (currentUserQuery.isError) {
      clearSession();
      queryClient.clear();
      navigate("/", { replace: true });
    }
  }, [clearSession, currentUserQuery.isError, navigate, queryClient]);

  if (!isAuthenticated) {
    return (
      <Button
        asChild
        className={cn("w-full", collapsed ? "px-0 md:size-9" : "justify-start")}
        aria-label="Continue with GitHub"
      >
        <a href={getGitHubLoginUrl()}>
          <LogIn />
          <span className={cn(collapsed && "md:hidden")}>Continue with GitHub</span>
        </a>
      </Button>
    );
  }

  if (currentUserQuery.isLoading) {
    return (
      <div
        className={cn(
          "flex h-12 items-center gap-3 rounded-md border bg-card/60 px-3 text-sm text-muted-foreground",
          collapsed && "md:justify-center md:px-0"
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        <span className={cn(collapsed && "md:hidden")}>Loading user</span>
      </div>
    );
  }

  const user = currentUserQuery.data;
  const github = user?.github;
  const displayName = github?.displayName ?? github?.username ?? user?.email ?? "Signed in";
  const username = github?.username ? `@${github.username}` : user?.email;
  const avatarUrl =
    github?.avatarUrl ?? (github ? `https://github.com/${github.username}.png?size=80` : null);

  return (
    <div className={cn("grid gap-3", collapsed && "md:place-items-center")}>
      <div
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-md border border-border bg-card/70 p-3",
          collapsed && "md:size-11 md:justify-center md:p-0"
        )}
        title={collapsed ? displayName : undefined}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-9 shrink-0 rounded-md border bg-muted object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid size-9 shrink-0 place-items-center rounded-md border bg-secondary text-secondary-foreground">
            <UserCircle className="size-4" />
          </div>
        )}
        <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{username}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary">
            <StatusDot active tone="success" />
            Connected with GitHub
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="utility"
        className={cn("w-full justify-start", collapsed && "md:size-9 md:px-0")}
        aria-label="Log out"
        title={collapsed ? "Log out" : undefined}
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
      >
        {logoutMutation.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
        <span className={cn(collapsed && "md:hidden")}>Logout</span>
      </Button>
    </div>
  );
}
