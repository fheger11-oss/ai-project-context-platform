import type {
  SourceFileStructure,
  SourceLanguage
} from "../source-structure/source-file-structure.js";

export const SOURCE_PARSER = Symbol("SOURCE_PARSER");

export type SourceParserInput = {
  path: string;
  language: SourceLanguage;
  content: string;
};

export interface SourceParser {
  parse(input: SourceParserInput): SourceFileStructure;
}
