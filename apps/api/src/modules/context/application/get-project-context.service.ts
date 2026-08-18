import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import type {
  ProjectContextReader,
  ReadProjectContextInput,
  ReadProjectContextResult
} from "../domain/contracts/project-context-reader.contract.js";
import { PersistProjectContextService } from "./persist-project-context.service.js";
import {
  REPOSITORY_OWNERSHIP_VERIFIER,
  type RepositoryOwnershipVerifier
} from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";

export type GetProjectContextQuery = {
  userId: string;
  contextId: string;
};

@Injectable()
export class GetProjectContextService implements ProjectContextReader {
  constructor(
    @Inject(PersistProjectContextService)
    private readonly persistProjectContextService: PersistProjectContextService,
    @Inject(REPOSITORY_OWNERSHIP_VERIFIER)
    private readonly repositoryOwnershipVerifier: RepositoryOwnershipVerifier
  ) {}

  async get(query: GetProjectContextQuery): Promise<PersistedProjectContext> {
    const context = await this.persistProjectContextService.findById(query.contextId);

    if (!context) {
      throw new NotFoundException("Context was not found");
    }

    await this.repositoryOwnershipVerifier.verifyRepositoryOwnership({
      userId: query.userId,
      repositoryId: context.repositoryId
    });

    return context;
  }

  async readProjectContext(
    input: ReadProjectContextInput
  ): Promise<ReadProjectContextResult | null> {
    const context = await this.persistProjectContextService.findById(input.contextId);

    if (!context) {
      return null;
    }

    await this.repositoryOwnershipVerifier.verifyRepositoryOwnership({
      userId: input.userId,
      repositoryId: context.repositoryId
    });

    return {
      projectContextId: context.id,
      projectContext: context.context
    };
  }
}
