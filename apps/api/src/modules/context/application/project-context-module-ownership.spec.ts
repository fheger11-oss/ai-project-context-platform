import { describe, expect, it } from "vitest";

import type { ArchitecturalModule } from "../domain/project-context-architecture.js";
import {
  ownershipForFile,
  projectCanonicalFileOwnership
} from "./project-context-module-ownership.js";

describe("projectCanonicalFileOwnership", () => {
  it("prefers the most-specific child and uses the workspace package as fallback", () => {
    const ownership = projectCanonicalFileOwnership([
      module("workspace", "WORKSPACE_PACKAGE", "apps/api", ["file:feature", "file:fallback"]),
      module("feature", "BACKEND_FEATURE", "apps/api/src/modules/context", ["file:feature"])
    ]);

    expect(ownershipForFile(ownership, "file:feature")).toEqual({
      status: "OWNED",
      moduleId: "feature"
    });
    expect(ownershipForFile(ownership, "file:fallback")).toEqual({
      status: "OWNED",
      moduleId: "workspace"
    });
  });

  it("prefers the longest child root", () => {
    const ownership = projectCanonicalFileOwnership([
      module("short", "SHARED_AREA", "apps/web/src", ["file:shared"]),
      module("long", "SHARED_AREA", "apps/web/src/components", ["file:shared"])
    ]);

    expect(ownershipForFile(ownership, "file:shared")).toEqual({
      status: "OWNED",
      moduleId: "long"
    });
  });

  it("reports equal-specificity ambiguity and unmapped files explicitly", () => {
    const ownership = projectCanonicalFileOwnership([
      module("module:b", "BACKEND_FEATURE", "root/bbbb", ["file:ambiguous"]),
      module("module:a", "BACKEND_FEATURE", "root/aaaa", ["file:ambiguous"])
    ]);

    expect(ownershipForFile(ownership, "file:ambiguous")).toEqual({
      status: "AMBIGUOUS",
      moduleIds: ["module:a", "module:b"]
    });
    expect(ownershipForFile(ownership, "file:missing")).toEqual({ status: "UNMAPPED" });
  });

  it("is deterministic for differently ordered module and file inputs", () => {
    const first = projectCanonicalFileOwnership([
      module("workspace", "WORKSPACE_PACKAGE", ".", ["file:b", "file:a"]),
      module("feature", "FRONTEND_FEATURE", "src/features/a", ["file:a"])
    ]);
    const second = projectCanonicalFileOwnership([
      module("feature", "FRONTEND_FEATURE", "src/features/a", ["file:a"]),
      module("workspace", "WORKSPACE_PACKAGE", ".", ["file:a", "file:b"])
    ]);

    expect([...first]).toEqual([...second]);
  });
});

function module(
  id: string,
  kind: ArchitecturalModule["kind"],
  rootPath: string,
  fileIds: string[]
): ArchitecturalModule {
  return {
    id,
    kind,
    name: id,
    rootPath,
    packageId: "package:owner",
    parentModuleId: kind === "WORKSPACE_PACKAGE" ? null : "workspace",
    fileIds,
    layers: [],
    sourceExports: [],
    frameworkSignals: [],
    inference: kind === "WORKSPACE_PACKAGE" ? "OBSERVED" : "INFERRED",
    confidence: kind === "WORKSPACE_PACKAGE" ? "HIGH" : "MEDIUM",
    evidence: []
  };
}
