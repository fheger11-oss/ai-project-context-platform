import type { SourceLocation } from "./source-location.js";

export type SourceNamedExport = {
  name: string;
  alias: string | null;
};

export type SourceExportKind =
  "DECLARATION" | "DEFAULT" | "NAMED" | "NAMESPACE" | "EXPORT_ASSIGNMENT";

export type SourceExport = {
  kind: SourceExportKind;
  name: string | null;
  moduleSpecifier: string | null;
  namedExports: readonly SourceNamedExport[];
  location: SourceLocation;
};
