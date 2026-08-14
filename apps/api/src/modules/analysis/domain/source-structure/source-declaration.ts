import type { SourceLocation } from "./source-location.js";

export type SourceDeclarationKind =
  | "FUNCTION"
  | "CLASS"
  | "INTERFACE"
  | "TYPE_ALIAS"
  | "ENUM"
  | "VARIABLE"
  | "CONSTANT"
  | "PARAMETER"
  | "METHOD"
  | "CLASS_PROPERTY";

export type SourceVisibility = "PUBLIC" | "PROTECTED" | "PRIVATE";

export type SourceDeclaration = {
  name: string;
  kind: SourceDeclarationKind;
  location: SourceLocation;
  containerName: string | null;
  visibility: SourceVisibility | null;
};
