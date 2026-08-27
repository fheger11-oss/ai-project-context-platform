import { describe, expect, it } from "vitest";

import { resolveApiUrl } from "./api-url";

describe("resolveApiUrl", () => {
  it("uses the development fallback outside production", () => {
    expect(resolveApiUrl({ PROD: false })).toBe("http://localhost:3000/api/v1");
  });

  it("uses an explicit API URL outside production", () => {
    expect(resolveApiUrl({ PROD: false, VITE_API_URL: "http://127.0.0.1:3999/api/v1" })).toBe(
      "http://127.0.0.1:3999/api/v1"
    );
  });

  it("requires an explicit API URL in production", () => {
    expect(() => resolveApiUrl({ PROD: true })).toThrow(/VITE_API_URL is required/);
  });

  it("rejects non-HTTPS production API URLs", () => {
    expect(() =>
      resolveApiUrl({ PROD: true, VITE_API_URL: "http://api.example.com/api/v1" })
    ).toThrow(/HTTPS/);
  });

  it("rejects localhost production API URLs", () => {
    expect(() =>
      resolveApiUrl({ PROD: true, VITE_API_URL: "https://localhost:3000/api/v1" })
    ).toThrow(/localhost/);
  });

  it("accepts a production HTTPS API URL", () => {
    expect(resolveApiUrl({ PROD: true, VITE_API_URL: "https://api.example.com/api/v1" })).toBe(
      "https://api.example.com/api/v1"
    );
  });
});
