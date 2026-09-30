import { describe, expectTypeOf, it } from "vitest";

import type {
  CreateProjectDecisionRequest,
  ProjectDecision,
  ProjectDecisionListResponse,
  ProjectDecisionStatus,
  UpdateProjectDecisionRequest
} from "./project-decisions.js";

describe("ProjectDecision contracts", () => {
  it("models the exact lifecycle and serialized timestamps", () => {
    expectTypeOf<ProjectDecisionStatus>().toEqualTypeOf<"ACTIVE" | "SUPERSEDED" | "ARCHIVED">();
    expectTypeOf<ProjectDecision>().toHaveProperty("decidedAt").toEqualTypeOf<string>();
    expectTypeOf<ProjectDecision>()
      .toHaveProperty("sourceCommitSha")
      .toEqualTypeOf<string | null>();
  });

  it("does not permit ownership or persistence fields in create/update requests", () => {
    expectTypeOf<CreateProjectDecisionRequest>().not.toHaveProperty("repositoryId");
    expectTypeOf<CreateProjectDecisionRequest>().not.toHaveProperty("status");
    expectTypeOf<UpdateProjectDecisionRequest>().not.toHaveProperty("repositoryId");
    expectTypeOf<UpdateProjectDecisionRequest>().not.toHaveProperty("sourceProjectContextId");
    expectTypeOf<ProjectDecisionListResponse>().toHaveProperty("pagination");
  });
});
