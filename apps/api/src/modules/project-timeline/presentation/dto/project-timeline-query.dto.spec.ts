import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROJECT_TIMELINE_PAGE,
  DEFAULT_PROJECT_TIMELINE_PAGE_SIZE,
  MAX_PROJECT_TIMELINE_PAGE_SIZE,
  ProjectTimelineQueryDto
} from "./project-timeline-query.dto.js";

describe("ProjectTimelineQueryDto", () => {
  it("uses the Timeline pagination defaults", async () => {
    const dto = plainToInstance(ProjectTimelineQueryDto, {});
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({
      page: DEFAULT_PROJECT_TIMELINE_PAGE,
      pageSize: DEFAULT_PROJECT_TIMELINE_PAGE_SIZE
    });
  });

  it("transforms valid explicit pagination", async () => {
    const dto = plainToInstance(ProjectTimelineQueryDto, { page: "2", pageSize: "30" });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ page: 2, pageSize: 30 });
  });

  it.each([
    { page: 0, pageSize: 20 },
    { page: 1.5, pageSize: 20 },
    { page: 1, pageSize: 0 },
    { page: 1, pageSize: MAX_PROJECT_TIMELINE_PAGE_SIZE + 1 }
  ])("rejects invalid pagination $page/$pageSize", async (input) => {
    expect(await validate(plainToInstance(ProjectTimelineQueryDto, input))).not.toEqual([]);
  });
});
