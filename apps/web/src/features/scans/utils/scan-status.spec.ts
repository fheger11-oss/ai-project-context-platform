import { describe, expect, it } from "vitest";

import { scanStatusLabel, scanStatusTone } from "./scan-status";

describe("scan status presentation", () => {
  it.each([
    ["PENDING", "Pending", "pending"],
    ["RUNNING", "Running", "running"],
    ["COMPLETED", "Completed", "success"],
    ["FAILED", "Failed", "error"],
    ["CANCELLED", "Cancelled", "muted"]
  ] as const)("maps %s to a consistent label and tone", (status, label, tone) => {
    expect(scanStatusLabel(status)).toBe(label);
    expect(scanStatusTone(status)).toBe(tone);
  });
});
