import type { ProjectContext } from "../project-context.js";

export const PROJECT_CONTEXT_READER = Symbol("PROJECT_CONTEXT_READER");

export type ReadProjectContextInput = {
  contextId: string;
};

export interface ProjectContextReader {
  readProjectContext(input: ReadProjectContextInput): Promise<ProjectContext | null>;
}
