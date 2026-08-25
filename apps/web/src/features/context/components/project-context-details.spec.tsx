import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProjectContextResponse } from "@ai-context/contracts";

import { ProjectContextDetails } from "./project-context-details";

const context: ProjectContextResponse = {
  id: "project_context_1",
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: "2026-08-17T10:00:00.000Z",
  createdAt: "2026-08-17T10:00:01.000Z",
  project: {
    claims: [
      {
        value: { type: "PRIMARY_LANGUAGE", language: "TYPESCRIPT" },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: [
          {
            kind: "PROJECT_METADATA",
            reference: { kind: "PROJECT_METADATA", field: "languages" }
          }
        ]
      }
    ]
  },
  technology: { claims: [] },
  structure: { claims: [] },
  architecture: { claims: [] },
  entryPoints: { claims: [] },
  testing: { claims: [] },
  infrastructure: { claims: [] },
  ambiguities: []
};

describe("ProjectContextDetails", () => {
  it("renders Context metadata, claims, confidence, kind, and evidence", () => {
    const markup = renderToStaticMarkup(<ProjectContextDetails context={context} />);

    expect(markup).toContain("Structured project knowledge");
    expect(markup).toContain("context-engine@5.7.1");
    expect(markup).toContain("Evidence references");
    expect(markup).toContain("Primary Language");
    expect(markup).toContain("Inferred");
    expect(markup).toContain("Medium confidence");
    expect(markup).toContain("Evidence (1)");
    expect(markup).toContain("Raw claim");
    expect(markup).toContain("Project Metadata");
    expect(markup).toContain("languages");
  });

  it("omits unsupported sections without fabricating claims", () => {
    const markup = renderToStaticMarkup(<ProjectContextDetails context={context} />);

    expect(markup).not.toContain("No claims");
    expect(markup).not.toContain("RUNTIME_SCRIPT");
    expect(markup).not.toContain("TEST_FRAMEWORK");
  });
});
