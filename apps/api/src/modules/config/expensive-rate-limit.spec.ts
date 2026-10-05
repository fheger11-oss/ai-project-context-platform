import "reflect-metadata";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalysisController } from "../analysis/presentation/analysis.controller.js";
import { AiExportController } from "../ai-export/presentation/ai-export.controller.js";
import { AnalysisContextController } from "../context/presentation/analysis-context.controller.js";
import { DocumentController } from "../document-generation/presentation/document.controller.js";
import { RepositoriesController } from "../repositories/repositories.controller.js";
import { RepositoryUpdatesController } from "../repository-updates/presentation/repository-updates.controller.js";
import { ScanController } from "../scan/presentation/scan.controller.js";

const THROTTLER_LIMIT_METADATA = "THROTTLER:LIMITdefault";
const THROTTLER_TTL_METADATA = "THROTTLER:TTLdefault";

const EXPENSIVE_METHODS = [
  AnalysisController.prototype.create,
  AiExportController.prototype.exportContext,
  AnalysisContextController.prototype.generate,
  DocumentController.prototype.create,
  DocumentController.prototype.regenerate,
  RepositoriesController.prototype.connect,
  RepositoriesController.prototype.listAvailableGitHubRepositories,
  RepositoriesController.prototype.refreshState,
  RepositoriesController.prototype.sync,
  RepositoryUpdatesController.prototype.runManualUpdate,
  ScanController.prototype.startScan
];

describe("expensive operation rate limiting", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("applies the configured strict limit to every expensive synchronous operation", () => {
    vi.stubEnv("RATE_LIMIT_EXPENSIVE_MAX", "4");
    vi.stubEnv("RATE_LIMIT_EXPENSIVE_TTL_SECONDS", "90");

    for (const method of EXPENSIVE_METHODS) {
      const limit = Reflect.getMetadata(THROTTLER_LIMIT_METADATA, method) as () => number;
      const ttl = Reflect.getMetadata(THROTTLER_TTL_METADATA, method) as () => number;

      expect(limit()).toBe(4);
      expect(ttl()).toBe(90_000);
    }
  });
});
