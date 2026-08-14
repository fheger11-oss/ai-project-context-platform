import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AnalysisHistoryItem } from "../domain/contracts/analysis-repository.contract.js";
import { PersistAnalysisResultService } from "./persist-analysis-result.service.js";
import {
  REPOSITORY_OWNERSHIP_VERIFIER,
  type RepositoryOwnershipVerifier
} from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";
import {
  SCAN_REPOSITORY,
  type ScanRepository
} from "../../scan/domain/contracts/scan-repository.contract.js";

export type GetAnalysisHistoryQuery = {
  userId: string;
  scanId: string;
};

@Injectable()
export class GetAnalysisHistoryService {
  constructor(
    @Inject(SCAN_REPOSITORY)
    private readonly scanRepository: ScanRepository,
    @Inject(REPOSITORY_OWNERSHIP_VERIFIER)
    private readonly repositoryOwnershipVerifier: RepositoryOwnershipVerifier,
    @Inject(PersistAnalysisResultService)
    private readonly persistAnalysisResultService: PersistAnalysisResultService
  ) {}

  async getByScan(query: GetAnalysisHistoryQuery): Promise<AnalysisHistoryItem[]> {
    const scan = await this.scanRepository.getScan(query.scanId);

    if (!scan) {
      throw new NotFoundException("Scan was not found");
    }

    await this.repositoryOwnershipVerifier.verifyRepositoryOwnership({
      userId: query.userId,
      repositoryId: scan.repositoryId
    });

    return this.persistAnalysisResultService.findHistoryByScanId(query.scanId);
  }
}
