export type ProjectSection =
  "overview" | "timeline" | "context" | "updates" | "documents" | "decisions" | "settings";

export function activeProjectSection(pathname: string, hash: string): ProjectSection | null {
  if (pathname.startsWith("/analyses/")) {
    return hash === "#documents" ? "documents" : "context";
  }

  if (/^\/repositories\/[^/]+\/decisions\/?$/.test(pathname)) {
    return "decisions";
  }

  if (/^\/repositories\/[^/]+\/timeline\/?$/.test(pathname)) {
    return "timeline";
  }

  if (pathname.startsWith("/repositories/")) {
    if (hash === "#updates") return "updates";
    return "overview";
  }

  return null;
}
