import { Inject, Injectable } from "@nestjs/common";

import {
  REPOSITORY_ACCESS_RESOLVER,
  type RepositoryAccessResolver
} from "../domain/contracts/repository-access-resolver.contract.js";
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
    @Inject(SCAN_REPOSITORY)
    private readonly scanRepository: ScanRepository,
    @Inject(REPOSITORY_CONTENT_PROVIDER)
    private readonly repositoryContentProvider: RepositoryContentProvider,
    @Inject(REPOSITORY_ACCESS_RESOLVER)
    private readonly repositoryAccessResolver: RepositoryAccessResolver
  ) {}

  /**
   * Future orchestration boundary:
   * resolve commit, create immutable scan, mark running, read metadata,
   * persist file metadata, update statistics, then mark completed or failed.
   */
  async startScan(input: StartScanInput): Promise<ScanSnapshot> {
    void input;
    void this.scanRepository;
    void this.repositoryContentProvider;
    void this.repositoryAccessResolver;
    throw new Error("Scan orchestration is not implemented.");
  }
}
