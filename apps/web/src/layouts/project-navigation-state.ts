export type ProjectSection =
  | "overview"
  | "timeline"
  | "context"
  | "architecture-intelligence"
  | "dependency-intelligence"
  | "architecture-history"
  | "updates"
  | "documents"
  | "decisions"
  | "knowledge"
  | "settings";

export function activeProjectSection(pathname: string, hash: string): ProjectSection | null {
  if (pathname.startsWith("/analyses/")) {
    return hash === "#documents" ? "documents" : "context";
  }

  if (/^\/repositories\/[^/]+\/decisions\/?$/.test(pathname)) {
    return "decisions";
  }

  if (/^\/repositories\/[^/]+\/knowledge\/?$/.test(pathname)) {
    return "knowledge";
  }

  if (/^\/repositories\/[^/]+\/timeline\/?$/.test(pathname)) {
    return "timeline";
  }

  if (/^\/repositories\/[^/]+\/architecture-history\/?$/.test(pathname)) {
    return "architecture-history";
  }

  if (/^\/repositories\/[^/]+\/architecture-intelligence\/?$/.test(pathname)) {
    return "architecture-intelligence";
  }

  if (/^\/repositories\/[^/]+\/dependency-intelligence\/?$/.test(pathname)) {
    return "dependency-intelligence";
  }

  if (pathname.startsWith("/repositories/")) {
    if (hash === "#updates") return "updates";
    return "overview";
  }

  return null;
}
