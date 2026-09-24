import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REPOSITORY_PROCESSING_COMPLETED_EVENT } from "./contracts/repository-processing-observation.contract.js";
import {
  RepositoryProcessingMode,
  RepositoryProcessingOutcome
} from "./contracts/repository-processing-result.contract.js";
import { LoggingRepositoryProcessingObservationSink } from "./logging-repository-processing-observation.sink.js";

describe("LoggingRepositoryProcessingObservationSink", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs the exact structured observation once", async () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const sink = new LoggingRepositoryProcessingObservationSink();
    const observation = {
      event: REPOSITORY_PROCESSING_COMPLETED_EVENT,
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "target"
    } as const;

    await sink.record(observation);

    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]![0]).toBe(observation);
  });
});
