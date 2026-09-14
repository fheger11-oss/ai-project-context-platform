type ApiUrlEnvironment = {
  MODE?: string;
  PROD?: boolean;
  VITE_API_URL?: string;
};

const LOCALHOST_HOSTNAME = ["local", "host"].join("");
const LOOPBACK_IPV4_HOSTNAME = ["127", "0", "0", "1"].join(".");
const UNSPECIFIED_IPV4_HOSTNAME = ["0", "0", "0", "0"].join(".");
const DEVELOPMENT_API_URL = `http://${LOCALHOST_HOSTNAME}:3000/api/v1`;
const LOCALHOST_HOSTNAMES = new Set([
  LOCALHOST_HOSTNAME,
  LOOPBACK_IPV4_HOSTNAME,
  UNSPECIFIED_IPV4_HOSTNAME,
  "::1"
]);

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
    throw new Error("VITE_API_URL cannot use a loopback host in production.");
  }

  return apiUrl;
}

export const API_URL = resolveApiUrl(import.meta.env);
