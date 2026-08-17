import type { ProjectContext } from "../project-context.js";

export const PROJECT_CONTEXT_REPOSITORY = Symbol("PROJECT_CONTEXT_REPOSITORY");

export type PersistedProjectContext = {
  id: string;
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: Date;
  createdAt: Date;
  context: ProjectContext;
};

export interface ProjectContextRepository {
  save(context: ProjectContext): Promise<PersistedProjectContext>;
  findById(id: string): Promise<PersistedProjectContext | null>;
  listByAnalysisId(analysisId: string): Promise<PersistedProjectContext[]>;
  findLatestByAnalysisId(analysisId: string): Promise<PersistedProjectContext | null>;
}
