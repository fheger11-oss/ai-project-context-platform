import { Inject, Injectable } from "@nestjs/common";

import type {
  CompletedScanReference,
  CompletedScanResolver
} from "../domain/contracts/completed-scan-resolver.contract.js";
import {
  SCAN_REPOSITORY,
  type ScanRepository
} from "../../scan/domain/contracts/scan-repository.contract.js";

@Injectable()
export class ScanRepositoryCompletedScanResolver implements CompletedScanResolver {
  constructor(
    @Inject(SCAN_REPOSITORY)
    private readonly scanRepository: ScanRepository
  ) {}

  async resolveCompletedScan(scanId: string): Promise<CompletedScanReference | null> {
    const scan = await this.scanRepository.getScan(scanId);

    if (!scan || scan.status !== "COMPLETED") {
      return null;
    }

    return {
      scanId: scan.id,
      repositoryId: scan.repositoryId,
      commitSha: scan.commitSha
    };
  }
}
