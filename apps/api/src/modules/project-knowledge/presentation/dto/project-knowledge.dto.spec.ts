import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateProjectKnowledgeDto } from "./create-project-knowledge.dto.js";
import {
  ProjectKnowledgeItemParamsDto,
  ProjectKnowledgeParamsDto
} from "./project-knowledge-params.dto.js";

describe("Project Knowledge DTO validation", () => {
  it("accepts a public create body without knowledgeId", async () => {
    const dto = plainToInstance(CreateProjectKnowledgeDto, { content: "  Durable fact  " });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.content).toBe("Durable fact");
    expect(dto).not.toHaveProperty("knowledgeId");
  });

  it("validates only the repository ID on collection routes", async () => {
    const params = plainToInstance(ProjectKnowledgeParamsDto, { id: "repository01" });

    await expect(validate(params)).resolves.toHaveLength(0);
  });

  it("retains knowledgeId validation on item routes", async () => {
    const missing = plainToInstance(ProjectKnowledgeItemParamsDto, { id: "repository01" });
    const valid = plainToInstance(ProjectKnowledgeItemParamsDto, {
      id: "repository01",
      knowledgeId: "cm1234567890abcdef"
    });

    expect((await validate(missing)).map((error) => error.property)).toContain("knowledgeId");
    await expect(validate(valid)).resolves.toHaveLength(0);
  });
});
