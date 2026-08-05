import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { RepositoryState } from "@/features/repositories/components/repository-state";
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
      navigate("/repositories", { replace: true });
      return;
    }

    setSession({
      accessToken,
      refreshToken,
      expiresIn
    });
    window.history.replaceState(null, "", "/auth/callback");
    navigate("/repositories", { replace: true });
  }, [navigate, setSession]);

  return (
    <RepositoryState
      title="Completing sign in"
      description="Your GitHub session is being connected."
    />
  );
}
