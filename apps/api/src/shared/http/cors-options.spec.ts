import { describe, expect, it, vi } from "vitest";

import { createCorsOptions } from "./cors-options.js";

describe("createCorsOptions", () => {
  it("allows configured browser origins with credentials", () => {
    const options = createCorsOptions(["https://ctxaro.com"]);
    const callback = vi.fn();

    if (typeof options.origin !== "function") throw new Error("Expected an origin callback");
    options.origin("https://ctxaro.com", callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    expect(options.credentials).toBe(true);
  });

  it("does not emit CORS permission for an unapproved origin", () => {
    const options = createCorsOptions(["https://ctxaro.com"]);
    const callback = vi.fn();

    if (typeof options.origin !== "function") throw new Error("Expected an origin callback");
    options.origin("https://attacker.example", callback);

    expect(callback).toHaveBeenCalledWith(null, false);
  });

  it("allows non-browser requests without an Origin header", () => {
    const options = createCorsOptions(["https://ctxaro.com"]);
    const callback = vi.fn();

    if (typeof options.origin !== "function") throw new Error("Expected an origin callback");
    options.origin(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});
