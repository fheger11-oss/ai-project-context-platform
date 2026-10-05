import { describe, expect, it, vi } from "vitest";

import {
  RepositoryProcessingMode,
  RepositoryProcessingOutcome
} from "./contracts/repository-processing-result.contract.js";
import type { RepositoryProcessingObservation } from "./contracts/repository-processing-observation.contract.js";
import { LoggingRepositoryProcessingResultConsumer } from "./logging-repository-processing-result.consumer.js";
import { RepositoryProcessingObservationMapper } from "./repository-processing-observation.mapper.js";

describe("LoggingRepositoryProcessingResultConsumer", () => {
  it("forwards the exact mapped observation to the configured sink", async () => {
    const mapper = new RepositoryProcessingObservationMapper();
    const result = {
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "target"
    } as const;
    const observation = mapper.map(result);
    const map = vi.spyOn(mapper, "map").mockReturnValue(observation);
    const record = vi.fn(async (_observation: RepositoryProcessingObservation) => undefined);
    const consumer = new LoggingRepositoryProcessingResultConsumer(mapper, { record });

    await consumer.consume(result);

    expect(map).toHaveBeenCalledWith(result);
    expect(record).toHaveBeenCalledOnce();
    expect(record.mock.calls[0]![0]).toBe(observation);
  });

  it("surfaces sink failures to the orchestration isolation boundary", async () => {
    const error = new Error("observation failed");
    const consumer = new LoggingRepositoryProcessingResultConsumer(
      new RepositoryProcessingObservationMapper(),
      { record: vi.fn(async () => Promise.reject(error)) }
    );

    await expect(
      consumer.consume({
        mode: RepositoryProcessingMode.FULL,
        outcome: RepositoryProcessingOutcome.COMPLETED,
        targetCommitSha: "target"
      })
    ).rejects.toBe(error);
  });
});
