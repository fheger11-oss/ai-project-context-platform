import type { ProjectContext } from "../project-context.js";

export const PROJECT_CONTEXT_READER = Symbol("PROJECT_CONTEXT_READER");

export type ReadProjectContextInput = {
  userId: string;
  contextId: string;
};

export type ReadProjectContextResult = {
  projectContextId: string;
  projectContext: ProjectContext;
};

export interface ProjectContextReader {
  readProjectContext(input: ReadProjectContextInput): Promise<ReadProjectContextResult | null>;
}
