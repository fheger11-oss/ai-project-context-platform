import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  CreateProjectKnowledgeRequest,
  ProjectKnowledge,
  ProjectKnowledgeStatus,
  UpdateProjectKnowledgeRequest
} from "./project-knowledge.js";

describe("Project Knowledge contracts", () => {
  it("keeps lifecycle and write contracts explicit", () => {
    expectTypeOf<ProjectKnowledgeStatus>().toEqualTypeOf<"ACTIVE" | "SUPERSEDED" | "ARCHIVED">();
    expectTypeOf<CreateProjectKnowledgeRequest>().toEqualTypeOf<{ content: string }>();
    expectTypeOf<UpdateProjectKnowledgeRequest>().toEqualTypeOf<{
      content?: string;
      status?: ProjectKnowledgeStatus;
    }>();
    expectTypeOf<ProjectKnowledge["sourceType"]>().toEqualTypeOf<
      "USER" | "REPOSITORY" | "PROJECT_CONTEXT" | "PROJECT_DECISION"
    >();
    expect(true).toBe(true);
  });
});
