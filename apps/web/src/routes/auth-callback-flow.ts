import type { QueryClient } from "@tanstack/react-query";

import { analytics } from "@/lib/analytics";
import { readAuthCallbackSession, type AuthCallbackSession } from "@/routes/auth-callback-session";

type AuthCallbackNavigate = (to: string, options: { replace: boolean }) => void;
type AuthCallbackQueryClient = Pick<QueryClient, "invalidateQueries" | "removeQueries">;

type CompleteAuthCallbackOptions = {
  hash: string;
  navigate: AuthCallbackNavigate;
  queryClient: AuthCallbackQueryClient;
  replaceCallbackUrl: () => void;
  setSession: (session: AuthCallbackSession) => void;
};

export function completeAuthCallback({
  hash,
  navigate,
  queryClient,
  replaceCallbackUrl,
  setSession
}: CompleteAuthCallbackOptions): boolean {
  const session = readAuthCallbackSession(hash);

  if (!session) {
    navigate("/", { replace: true });
    return false;
  }

  setSession(session);
  analytics.track("github_login_completed", { method: "github" });
  replaceCallbackUrl();
  queryClient.removeQueries({ queryKey: ["auth", "me"] });
  void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  navigate("/", { replace: true });
  return true;
}
