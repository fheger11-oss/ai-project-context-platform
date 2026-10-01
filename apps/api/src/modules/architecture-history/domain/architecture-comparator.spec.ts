import { describe, expect, it } from "vitest";

import { compareArchitectureSnapshots } from "./architecture-comparator.js";
import { parseArchitectureSnapshot } from "./architecture-snapshot.js";
import {
  moduleClaim,
  relationshipClaim,
  snapshot
} from "../testing/architecture-history-fixtures.js";

function normalized(claims: unknown[]) {
  const parsed = parseArchitectureSnapshot(snapshot(claims));
  if (!parsed.valid) throw new Error(JSON.stringify(parsed.diagnostics));
  return parsed.snapshot;
}

describe("compareArchitectureSnapshots", () => {
  it("classifies added, removed, and relationship-modified modules", () => {
    const baseline = normalized([
      moduleClaim("src/a"),
      moduleClaim("src/b"),
      relationshipClaim("module:src/a", "module:src/b")
    ]);
    const target = normalized([
      moduleClaim("src/a"),
      moduleClaim("src/c"),
      relationshipClaim("module:src/a", "module:src/c")
    ]);
    const result = compareArchitectureSnapshots(baseline, target);

    expect(result.addedModules.map((item) => item.moduleId)).toEqual(["module:src/c"]);
    expect(result.removedModules.map((item) => item.moduleId)).toEqual(["module:src/b"]);
    expect(result.modifiedModules).toHaveLength(1);
    expect(result.modifiedModules[0]?.module.moduleId).toBe("module:src/a");
    expect(result.modifiedModules[0]?.addedOutgoingRelationships).toHaveLength(1);
    expect(result.modifiedModules[0]?.removedOutgoingRelationships).toHaveLength(1);
  });

  it("treats relationship direction as identity", () => {
    const modules = [moduleClaim("src/a"), moduleClaim("src/b")];
    const result = compareArchitectureSnapshots(
      normalized([...modules, relationshipClaim("module:src/a", "module:src/b")]),
      normalized([...modules, relationshipClaim("module:src/b", "module:src/a")])
    );
    expect(result.addedRelationships).toHaveLength(1);
    expect(result.removedRelationships).toHaveLength(1);
  });

  it("modifies retained targets when their incoming relationships change", () => {
    const modules = [moduleClaim("src/a"), moduleClaim("src/b"), moduleClaim("src/c")];
    const result = compareArchitectureSnapshots(
      normalized([...modules, relationshipClaim("module:src/a", "module:src/c")]),
      normalized([...modules, relationshipClaim("module:src/b", "module:src/c")])
    );
    const target = result.modifiedModules.find((item) => item.module.moduleId === "module:src/c");
    expect(target?.addedIncomingRelationships).toHaveLength(1);
    expect(target?.removedIncomingRelationships).toHaveLength(1);
  });

  it("keeps identical directed relationships unchanged", () => {
    const claims = [
      moduleClaim("src/a"),
      moduleClaim("src/b"),
      relationshipClaim("module:src/a", "module:src/b")
    ];
    const result = compareArchitectureSnapshots(
      normalized(claims),
      normalized([...claims].reverse())
    );
    expect(result).toMatchObject({
      addedRelationships: [],
      removedRelationships: [],
      unchangedRelationshipCount: 1,
      unchangedModuleCount: 2
    });
  });

  it("ignores relationship-count-only changes", () => {
    const modules = [moduleClaim("src/a"), moduleClaim("src/b")];
    const result = compareArchitectureSnapshots(
      normalized([...modules, relationshipClaim("module:src/a", "module:src/b")]),
      normalized([
        ...modules,
        relationshipClaim("module:src/a", "module:src/b", { relationshipCount: 99 })
      ])
    );
    expect(result).toMatchObject({
      addedRelationships: [],
      removedRelationships: [],
      unchangedRelationshipCount: 1,
      modifiedModules: []
    });
  });

  it("reports a move as removal plus addition", () => {
    const result = compareArchitectureSnapshots(
      normalized([moduleClaim("src/old")]),
      normalized([moduleClaim("src/new")])
    );
    expect(result.removedModules[0]?.moduleId).toBe("module:src/old");
    expect(result.addedModules[0]?.moduleId).toBe("module:src/new");
  });

  it("ignores counts, MEDIUM/HIGH confidence, evidence, and collection ordering", () => {
    const baselineModule = moduleClaim("src/a");
    const targetModule = {
      ...moduleClaim("src/a", { sourceFileCount: 99, declarationCount: 55 }),
      evidence: [{ kind: "SOURCE_STRUCTURE", reference: { path: "src/a/x.ts" } }]
    };
    targetModule.confidence = "HIGH";
    const result = compareArchitectureSnapshots(
      normalized([baselineModule, moduleClaim("src/b")]),
      normalized([moduleClaim("src/b"), targetModule])
    );
    expect(result).toMatchObject({
      addedModules: [],
      removedModules: [],
      modifiedModules: [],
      unchangedModuleCount: 2
    });
  });
});
