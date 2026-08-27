type ApiUrlEnvironment = {
  MODE?: string;
  PROD?: boolean;
  VITE_API_URL?: string;
};

const DEVELOPMENT_API_URL = "http://localhost:3000/api/v1";
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function resolveApiUrl(environment: ApiUrlEnvironment): string {
  const apiUrl = environment.VITE_API_URL;

  if (!environment.PROD) {
    return apiUrl ?? DEVELOPMENT_API_URL;
  }

  if (!apiUrl) {
    throw new Error("VITE_API_URL is required for production builds.");
  }

  const parsedUrl = new URL(apiUrl);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("VITE_API_URL must use HTTPS in production.");
  }

  if (LOCALHOST_HOSTNAMES.has(parsedUrl.hostname)) {
    throw new Error("VITE_API_URL cannot use localhost in production.");
  }

  return apiUrl;
}

export const API_URL = resolveApiUrl(import.meta.env);
