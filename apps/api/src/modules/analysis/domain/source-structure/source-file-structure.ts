import type { SourceDeclaration } from "./source-declaration.js";
import type { SourceExport } from "./source-export.js";
import type { SourceImport } from "./source-import.js";

export type SourceLanguage = "TYPESCRIPT" | "TYPESCRIPT_TSX" | "JAVASCRIPT" | "JAVASCRIPT_JSX";

export type SourceParseIssueCode = "PARSE_ERROR" | "UNSUPPORTED_SOURCE" | "EMPTY_SOURCE";

export type SourceParseIssue = {
  code: SourceParseIssueCode;
  message: string;
};

export type SourceFileStructure = {
  path: string;
  language: SourceLanguage;
  imports: readonly SourceImport[];
  exports: readonly SourceExport[];
  declarations: readonly SourceDeclaration[];
  issues: readonly SourceParseIssue[];
};
