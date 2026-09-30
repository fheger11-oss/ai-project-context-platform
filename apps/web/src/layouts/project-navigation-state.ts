export type ProjectSection =
  "overview" | "context" | "updates" | "documents" | "decisions" | "settings";

export function activeProjectSection(pathname: string, hash: string): ProjectSection | null {
  if (pathname.startsWith("/analyses/")) {
    return hash === "#documents" ? "documents" : "context";
  }

  if (/^\/repositories\/[^/]+\/decisions\/?$/.test(pathname)) {
    return "decisions";
  }

  if (pathname.startsWith("/repositories/")) {
    if (hash === "#updates") return "updates";
    return "overview";
  }

  return null;
}
