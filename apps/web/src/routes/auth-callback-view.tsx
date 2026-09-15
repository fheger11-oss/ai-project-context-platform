import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { CtxaroWordmark } from "@/features/brand/components/ctxaro-brand";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { completeAuthCallback } from "@/routes/auth-callback-flow";

export function AuthCallbackView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthSessionStore((state) => state.setSession);

  useEffect(() => {
    completeAuthCallback({
      hash: window.location.hash,
      navigate,
      queryClient,
      replaceCallbackUrl: () => window.history.replaceState(null, "", "/auth/callback"),
      setSession
    });
  }, [navigate, queryClient, setSession]);

  return (
    <section
      aria-labelledby="auth-callback-title"
      className="grid min-h-[320px] place-items-center rounded-lg border border-border bg-card/70 px-6 py-12 text-center shadow-[var(--shadow-control)]"
    >
      <div className="grid justify-items-center gap-5">
        <CtxaroWordmark className="rounded-md outline-none" />
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
            GitHub connection
          </p>
          <h1 id="auth-callback-title" className="mt-3 text-2xl font-semibold text-foreground">
            Finishing GitHub connection...
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Connect your GitHub account to explore and analyze your repositories with ctxaro.
          </p>
        </div>
      </div>
    </section>
  );
}
