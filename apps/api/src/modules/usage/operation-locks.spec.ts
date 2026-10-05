import { describe, expect, it } from "vitest";

import { V1_USAGE_LIMITS } from "./v1-usage-limits.js";
import { repositoryUpdateLock } from "./operation-locks.js";

describe("operation lock helpers", () => {
  it("builds a repository update lock keyed by repository", () => {
    expect(repositoryUpdateLock("repository_1")).toEqual({
      key: "repository:repository_1:update",
      operationType: "repository.update",
      leaseMs: V1_USAGE_LIMITS.lockLeaseMs.scan
    });
  });

  it("uses distinct repository update locks for distinct repositories", () => {
    expect(repositoryUpdateLock("repository_1").key).not.toBe(
      repositoryUpdateLock("repository_2").key
    );
  });
});
