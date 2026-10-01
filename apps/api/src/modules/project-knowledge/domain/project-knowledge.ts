import type { ProjectKnowledgeStatus } from "@ai-context/contracts";

export const PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH = 20_000;

export function normalizeProjectKnowledgeContent(value: string): string {
  const content = value.trim();
  if (!content) throw new Error("ProjectKnowledge content is required.");
  if (content.length > PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH) {
    throw new Error(
      `ProjectKnowledge content must not exceed ${PROJECT_KNOWLEDGE_CONTENT_MAX_LENGTH} characters.`
    );
  }
  return content;
}

export function canTransitionProjectKnowledgeStatus(
  from: ProjectKnowledgeStatus,
  to: ProjectKnowledgeStatus
): boolean {
  if (from === to) return true;
  return (
    (from === "ACTIVE" && (to === "SUPERSEDED" || to === "ARCHIVED")) ||
    (from === "ARCHIVED" && to === "ACTIVE")
  );
}
