import type { ProjectContext } from "../project-context.js";
import type { ContextInput } from "./context-input.contract.js";

export const CONTEXT_GENERATOR = Symbol("CONTEXT_GENERATOR");

export interface ContextGenerator {
  generate(input: ContextInput): Promise<ProjectContext>;
}
