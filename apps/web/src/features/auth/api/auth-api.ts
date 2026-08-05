import type { AuthenticatedUser } from "@ai-context/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function getGitHubLoginUrl() {
  return `${API_URL}/auth/github`;
}

async function request<T>(
  path: string,
  options: { accessToken?: string; body?: unknown; method?: "GET" | "POST" } = {}
): Promise<T> {
  const headers = new Headers();

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new AuthRequestError(
      payload?.message ?? "Authentication request failed",
      response.status
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getCurrentUser(accessToken: string) {
  return request<AuthenticatedUser>("/auth/me", { accessToken });
}

export function logout(refreshToken: string) {
  return request<void>("/auth/logout", {
    method: "POST",
    body: {
      refreshToken
    }
  });
}

export type { AuthenticatedUser };
