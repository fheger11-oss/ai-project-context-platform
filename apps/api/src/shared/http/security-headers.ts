import helmet from "helmet";

export function createSecurityHeadersMiddleware() {
  return helmet();
}
