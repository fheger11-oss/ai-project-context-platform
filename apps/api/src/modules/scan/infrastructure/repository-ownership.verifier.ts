import { Inject, Injectable } from "@nestjs/common";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import type {
  RepositoryOwnershipVerifier,
  VerifyRepositoryOwnershipInput
} from "../domain/contracts/repository-ownership-verifier.contract.js";

@Injectable()
export class RepositoryOwnershipVerifierInfrastructure implements RepositoryOwnershipVerifier {
  constructor(
    @Inject(RepositoriesService)
    private readonly repositoriesService: RepositoriesService
  ) {}

  async verifyRepositoryOwnership(input: VerifyRepositoryOwnershipInput): Promise<void> {
    await this.repositoriesService.getScanAccessMetadataForUser(input.userId, input.repositoryId);
  }
}
