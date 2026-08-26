export const productPipelineStages = [
  { key: "repository", label: "Repository" },
  { key: "scan", label: "Scan" },
  { key: "analysis", label: "Analysis" },
  { key: "context", label: "Context" },
  { key: "documents", label: "Documents" },
  { key: "ai-export", label: "AI Export" }
] as const;

export type ProductPipelineStageKey = (typeof productPipelineStages)[number]["key"];
