import { describe, expect, it, vi } from "vitest";

import type { ContextGenerator } from "../domain/contracts/context-generator.contract.js";
import type { ContextInput } from "../domain/contracts/context-input.contract.js";
import { ProjectContext } from "../domain/project-context.js";
import { GenerateProjectContextService } from "./generate-project-context.service.js";
import type { ReadContextInputService } from "./read-context-input.service.js";

const context = ProjectContext.create({
  contextId: "context_1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.3.0",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});

const input = {
  analysis: {
    analysisId: "analysis_1"
  }
} as ContextInput;

describe("GenerateProjectContextService", () => {
  it("orchestrates ContextInput reading and deterministic generation", async () => {
    const readContextInputService = {
      read: vi.fn(async () => input)
    } as unknown as ReadContextInputService;
    const contextGenerator = {
      generate: vi.fn(async () => context)
    } as unknown as ContextGenerator;
    const service = new GenerateProjectContextService(readContextInputService, contextGenerator);

    await expect(service.generate({ userId: "user_1", analysisId: "analysis_1" })).resolves.toBe(
      context
    );
    expect(readContextInputService.read).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
    expect(contextGenerator.generate).toHaveBeenCalledWith(input);
  });
});
