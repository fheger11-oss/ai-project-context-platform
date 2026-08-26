import type { ProjectContext } from "../../../context/domain/project-context.js";
import type { CanonicalAiExport } from "../canonical-ai-export.js";

export const AI_EXPORT_PROJECTOR = Symbol("AI_EXPORT_PROJECTOR");

export interface AiExportProjector {
  project(projectContext: ProjectContext): CanonicalAiExport;
}
