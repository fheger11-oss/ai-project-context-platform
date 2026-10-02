import helmet from "helmet";

export function createSecurityHeadersMiddleware(production = false) {
  return helmet(
    production
      ? { frameguard: { action: "deny" } }
      : { frameguard: { action: "deny" }, strictTransportSecurity: false }
  );
}
