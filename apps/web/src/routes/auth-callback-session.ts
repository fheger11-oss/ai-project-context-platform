export type AuthCallbackSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function readAuthCallbackSession(hash: string): AuthCallbackSession | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = Number(params.get("expires_in"));

  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn)) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
}
