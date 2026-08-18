import type { GeneratedDocument } from "../generated-document.js";
import type { DocumentGenerationInput } from "./document-generation-input.contract.js";

export const DOCUMENT_GENERATOR = Symbol("DOCUMENT_GENERATOR");

export interface DocumentGenerator {
  generate(input: DocumentGenerationInput): Promise<GeneratedDocument>;
}
