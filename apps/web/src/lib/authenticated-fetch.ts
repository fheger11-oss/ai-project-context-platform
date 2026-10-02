import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { API_URL } from "@/lib/api-url";

let refreshPromise: Promise<string | null> | null = null;

type RefreshAuthResponse = {
  tokens: {
    accessToken: string;
    expiresIn: number;
  };
};

export async function authenticatedFetch(
  path: string,
  init: RequestInit,
  options: { retryOnUnauthorized?: boolean } = {}
): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (response.status !== 401 || options.retryOnUnauthorized === false) {
    return response;
  }

  const refreshedAccessToken = await refreshAccessToken();

  if (!refreshedAccessToken) {
    return response;
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${refreshedAccessToken}`);

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers
  });
}

async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= refreshAccessTokenOnce().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  const { clearSession, setSession } = useAuthSessionStore.getState();

  const response = await fetch(`${API_URL}/auth/refresh`, {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const authResponse = (await response.json()) as RefreshAuthResponse;

  setSession({
    accessToken: authResponse.tokens.accessToken,
    expiresIn: authResponse.tokens.expiresIn
  });

  return authResponse.tokens.accessToken;
}
