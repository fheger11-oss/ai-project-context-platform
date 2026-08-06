import { Inject, Injectable, Optional } from "@nestjs/common";

import {
  REPOSITORY_CONTENT_PROVIDER,
  type RepositoryContentProvider
} from "../domain/contracts/repository-content-provider.contract.js";
import {
  SCAN_REPOSITORY,
  type ScanRepository,
  type ScanSnapshot
} from "../domain/contracts/scan-repository.contract.js";

export type StartScanInput = {
  repositoryId: string;
  reference: string;
};

@Injectable()
export class ScanService {
  constructor(
    @Optional()
    @Inject(SCAN_REPOSITORY)
    private readonly scanRepository?: ScanRepository,
    @Optional()
    @Inject(REPOSITORY_CONTENT_PROVIDER)
    private readonly repositoryContentProvider?: RepositoryContentProvider
  ) {}

  /**
   * Future orchestration boundary:
   * resolve commit, create immutable scan, mark running, read metadata,
   * persist file metadata, update statistics, then mark completed or failed.
   */
  async startScan(input: StartScanInput): Promise<ScanSnapshot> {
    void input;
    this.ensureInfrastructureIsRegistered();
  }

  private ensureInfrastructureIsRegistered(): never {
    if (!this.scanRepository || !this.repositoryContentProvider) {
      throw new Error("Scan infrastructure contracts are not registered.");
    }

    throw new Error("Scan orchestration is not implemented.");
  }
}
