export type AuthCallbackSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function readAuthCallbackSession(hash: string): AuthCallbackSession | null {
  if (!hash.startsWith("#")) {
    return null;
  }

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresInValue = params.get("expires_in");
  const expiresIn = Number(expiresInValue);

  if (!accessToken || !refreshToken || !expiresInValue || !Number.isFinite(expiresIn)) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
}
