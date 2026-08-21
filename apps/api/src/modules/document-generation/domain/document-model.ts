export type DocumentModel = {
  title: string;
  sections: readonly DocumentSection[];
};

export type DocumentSection = {
  heading: string;
  blocks: readonly DocumentBlock[];
};

export type DocumentBlock =
  | {
      kind: "paragraph";
      text: string;
    }
  | {
      kind: "unordered-list";
      items: readonly string[];
    }
  | {
      kind: "table";
      columns: readonly string[];
      rows: readonly (readonly string[])[];
    };
