import { Inject, Injectable } from "@nestjs/common";

import {
  COMPLETED_SCAN_RESOLVER,
  type CompletedScanResolver
} from "../domain/contracts/completed-scan-resolver.contract.js";
import {
  SCAN_CONTENT_READER,
  type ScanContentReader
} from "../domain/contracts/scan-content-reader.contract.js";
import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import { ScanNotReadyForAnalysisError } from "./errors/scan-not-ready-for-analysis.error.js";

export type PrepareAnalysisInputCommand = {
  scanId: string;
};

@Injectable()
export class AnalysisInputService {
  constructor(
    @Inject(COMPLETED_SCAN_RESOLVER)
    private readonly completedScanResolver: CompletedScanResolver,
    @Inject(SCAN_CONTENT_READER)
    private readonly scanContentReader: ScanContentReader
  ) {}

  async prepareAnalysisInput(command: PrepareAnalysisInputCommand): Promise<AnalysisInput> {
    const completedScan = await this.completedScanResolver.resolveCompletedScan(command.scanId);

    if (!completedScan) {
      throw new ScanNotReadyForAnalysisError(command.scanId);
    }

    return {
      scanId: completedScan.scanId,
      repositoryId: completedScan.repositoryId,
      commitSha: completedScan.commitSha,
      contentReader: this.scanContentReader
    };
  }
}
