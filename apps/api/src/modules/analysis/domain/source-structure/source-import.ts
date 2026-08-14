import type { SourceLocation } from "./source-location.js";

export type SourceNamedImport = {
  name: string;
  alias: string | null;
};

export type SourceImport = {
  moduleSpecifier: string;
  defaultImport: string | null;
  namespaceImport: string | null;
  namedImports: readonly SourceNamedImport[];
  typeOnly: boolean;
  location: SourceLocation;
};
