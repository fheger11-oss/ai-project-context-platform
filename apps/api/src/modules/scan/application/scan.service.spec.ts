import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { ScanService } from "./scan.service.js";

describe("ScanService", () => {
  it("declares only contract tokens as constructor dependencies", () => {
    const dependencyTokens = Reflect.getMetadata("self:paramtypes", ScanService) as
      Array<{ index: number; param: unknown }> | undefined;

    expect(dependencyTokens?.map((dependency) => dependency.param)).toEqual([
      expect.any(Symbol),
      expect.any(Symbol),
      expect.any(Symbol)
    ]);
  });
});
