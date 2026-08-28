import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { CtxaroWordmark } from "@/features/brand/components/ctxaro-brand";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";

export function AuthCallbackView() {
  const navigate = useNavigate();
  const setSession = useAuthSessionStore((state) => state.setSession);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = Number(params.get("expires_in"));

    if (!accessToken || !refreshToken || !Number.isFinite(expiresIn)) {
      navigate("/", { replace: true });
      return;
    }

    setSession({
      accessToken,
      refreshToken,
      expiresIn
    });
    window.history.replaceState(null, "", "/auth/callback");
    navigate("/", { replace: true });
  }, [navigate, setSession]);

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
