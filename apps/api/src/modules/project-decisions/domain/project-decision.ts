import type { ProjectDecisionStatus } from "@ai-context/contracts";

export const PROJECT_DECISION_TITLE_MAX_LENGTH = 200;
export const PROJECT_DECISION_TEXT_MAX_LENGTH = 20_000;
export const PROJECT_DECISION_AFFECTED_AREA_MAX_LENGTH = 120;
export const FULL_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function normalizeRequiredText(value: string): string {
  return value.trim();
}

export function normalizeCommitSha(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

export function canTransitionProjectDecisionStatus(
  from: ProjectDecisionStatus,
  to: ProjectDecisionStatus
): boolean {
  if (from === to) return true;

  return (
    (from === "ACTIVE" && (to === "SUPERSEDED" || to === "ARCHIVED")) ||
    (from === "ARCHIVED" && to === "ACTIVE")
  );
}
