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

    expect(markup).toContain("Context Overview");
    expect(markup).toContain("context-engine@5.7.1");
    expect(markup).toContain("PRIMARY_LANGUAGE");
    expect(markup).toContain("INFERRED");
    expect(markup).toContain("MEDIUM");
    expect(markup).toContain("PROJECT_METADATA");
    expect(markup).toContain("languages");
  });

  it("renders empty sections without fabricating claims", () => {
    const markup = renderToStaticMarkup(<ProjectContextDetails context={context} />);

    expect(markup).toContain("No Context claims in this section.");
    expect(markup).not.toContain("RUNTIME_SCRIPT");
    expect(markup).not.toContain("TEST_FRAMEWORK");
  });
});
