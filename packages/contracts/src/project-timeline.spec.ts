import { describe, expectTypeOf, it } from "vitest";

import type {
  ContextPromotedTimelineItem,
  DecisionEffectiveTimelineItem,
  ProjectTimelineItem,
  ProjectTimelineItemType,
  ProjectTimelineResponse,
  RepositoryConnectedTimelineItem,
  RepositoryUpdateTimelineItem
} from "./project-timeline.js";

describe("ProjectTimeline contracts", () => {
  it("defines only the four initial explicit item discriminators", () => {
    expectTypeOf<ProjectTimelineItemType>().toEqualTypeOf<
      "REPOSITORY_CONNECTED" | "REPOSITORY_UPDATE" | "CONTEXT_PROMOTED" | "DECISION_EFFECTIVE"
    >();
    expectTypeOf<ProjectTimelineItem>().toMatchTypeOf<
      | RepositoryConnectedTimelineItem
      | RepositoryUpdateTimelineItem
      | ContextPromotedTimelineItem
      | DecisionEffectiveTimelineItem
    >();
  });

  it("requires common identity and serialized time fields", () => {
    expectTypeOf<ProjectTimelineItem>().toHaveProperty("sourceId").toEqualTypeOf<string>();
    expectTypeOf<ProjectTimelineItem>().toHaveProperty("repositoryId").toEqualTypeOf<string>();
    expectTypeOf<ProjectTimelineItem>().toHaveProperty("occurredAt").toEqualTypeOf<string>();
  });

  it("keeps source-specific fields explicit", () => {
    expectTypeOf<RepositoryUpdateTimelineItem>()
      .toHaveProperty("targetCommitSha")
      .toEqualTypeOf<string>();
    expectTypeOf<ContextPromotedTimelineItem>()
      .toHaveProperty("contextVersion")
      .toEqualTypeOf<string>();
    expectTypeOf<DecisionEffectiveTimelineItem>()
      .toHaveProperty("status")
      .toEqualTypeOf<"ACTIVE" | "SUPERSEDED" | "ARCHIVED">();
    expectTypeOf<ProjectTimelineItem>().not.toHaveProperty("payload");
  });

  it("exposes complete page metadata", () => {
    expectTypeOf<ProjectTimelineResponse["pagination"]>().toEqualTypeOf<{
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    }>();
  });
});
