export const ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID = "architecture.circular-dependency" as const;
export const LEGACY_ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION = "1.0" as const;
export const ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION = "2.0" as const;

export const ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE = {
  id: ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID,
  version: ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION,
  provenance: "CTXARO_DEFINED",
  type: "CIRCULAR_DEPENDENCY",
  scope: "ARCHITECTURE_MODULE_GRAPH",
  coverageRequirements: {
    relationshipKinds: ["IMPORTS", "RE_EXPORTS"],
    resolvedOnly: true
  }
} as const;

export function circularDependencyRuleVersionForProcessor(processorVersion: string): string {
  return processorVersion === "architecture-processor-1.0"
    ? LEGACY_ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION
    : ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION;
}
