import { Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";

import type {
  RepositoryWebhookProvisioningOutcome,
  RepositoryWebhookProvisioningStatus
} from "../../../generated/prisma/enums.js";
import { GitHubAccountService } from "../../auth/providers/github-account.service.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { OperationLockService } from "../../usage/operation-lock.service.js";
import { repositoryAutomationLock } from "../../usage/operation-locks.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import {
  REPOSITORY_WEBHOOK_PROVIDER,
  type RepositoryWebhook,
  type RepositoryWebhookProvider,
  type RepositoryWebhookProviderAccess
} from "./contracts/repository-webhook-provider.contract.js";
import {
  repositoryAutomationStatus,
  type RepositoryAutomationCapability,
  type RepositoryAutomationStatus
} from "../domain/repository-automation-status.js";
import { RepositoryWebhookProviderError } from "../domain/repository-webhook-provider.error.js";
import { GitHubRepositoryProvider } from "../providers/github-repository.provider.js";

type OwnedRepository = {
  id: string;
  userId: string;
  githubId: string;
  owner: string;
  name: string;
};

type CleanupResult =
  | {
      completed: true;
      outcome: "WEBHOOK_DELETED" | "WEBHOOK_ALREADY_DELETED";
    }
  | {
      completed: false;
      webhook: {
        provisioningStatus: RepositoryWebhookProvisioningStatus;
        lastOutcome: RepositoryWebhookProvisioningOutcome | null;
        lastVerifiedAt: Date | null;
      };
    };

const EXPECTED_EVENTS = ["push"];

@Injectable()
export class RepositoryWebhookProvisioningService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GitHubAccountService) private readonly accounts: GitHubAccountService,
    @Inject(GitHubRepositoryProvider) private readonly repositories: GitHubRepositoryProvider,
    @Inject(REPOSITORY_WEBHOOK_PROVIDER)
    private readonly provider: RepositoryWebhookProvider,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(OperationLockService) private readonly locks: OperationLockService
  ) {}

  async getStatus(
    user: AuthenticatedUser,
    repositoryId: string
  ): Promise<RepositoryAutomationStatus> {
    const repository = await this.requireOwnedRepository(user.id, repositoryId);
    const capability = await this.resolveCapability(user.id, repository);
    const webhook = await this.prisma.repositoryWebhook.findUnique({
      where: { repositoryId }
    });

    return this.status(capability, webhook);
  }

  async reconcile(
    user: AuthenticatedUser,
    repositoryId: string,
    existingAccessToken?: string
  ): Promise<RepositoryAutomationStatus> {
    return this.locks.withLocks([repositoryAutomationLock(repositoryId)], async () => {
      const repository = await this.requireOwnedRepository(user.id, repositoryId);
      const callbackUrl = this.config.githubWebhookCallbackUrl;
      const secret = this.config.githubWebhookSecret;

      if (!callbackUrl || !secret) {
        return this.persistStatus(
          repository,
          "PROVIDER_UNAVAILABLE",
          "FAILED",
          "WEBHOOK_CONFIGURATION_INVALID",
          false
        );
      }

      const token = existingAccessToken ?? (await this.accessToken(user.id).catch(() => null));

      if (!token) {
        return this.persistStatus(
          repository,
          "PROVIDER_ACCESS_DENIED",
          "REQUIRES_AUTHORIZATION",
          "WEBHOOK_NOT_AUTHORIZED",
          false
        );
      }

      const capability = (
        await this.repositories.checkWebhookManagementCapability(token, repository)
      ).capability;

      if (capability !== "CAN_MANAGE_WEBHOOK") {
        return this.persistCapabilityFailure(repository, capability);
      }

      const access = this.providerAccess(repository, token);
      const existing = await this.prisma.repositoryWebhook.upsert({
        where: { repositoryId },
        create: {
          repositoryId,
          provider: "GITHUB",
          callbackUrl,
          subscribedEvents: EXPECTED_EVENTS,
          provisioningStatus: "PROVISIONING",
          lastProvisioningAttemptAt: new Date()
        },
        update: {
          callbackUrl,
          subscribedEvents: EXPECTED_EVENTS,
          provisioningStatus: "PROVISIONING",
          lastProvisioningAttemptAt: new Date()
        }
      });

      try {
        if (existing.providerWebhookId) {
          try {
            const remote = await this.provider.get(access, existing.providerWebhookId);
            return this.ensureConfigured(
              repository,
              capability,
              access,
              remote,
              secret,
              callbackUrl,
              existing.secretFingerprint === this.secretFingerprint(secret)
            );
          } catch (error) {
            if (!this.isProviderFailure(error, "NOT_FOUND")) {
              throw error;
            }
          }
        }

        const hooks = await this.provider.list(access);
        const candidates = hooks.filter((hook) => this.isOwnedCandidate(hook, callbackUrl));

        if (candidates.length > 1) {
          return this.persistStatus(
            repository,
            capability,
            "FAILED",
            "WEBHOOK_CONFIGURATION_INVALID",
            false
          );
        }

        if (candidates.length === 1) {
          return this.ensureConfigured(
            repository,
            capability,
            access,
            candidates[0]!,
            secret,
            callbackUrl,
            false
          );
        }

        const created = await this.provider.create({
          ...access,
          ...this.expectedConfiguration(callbackUrl),
          secret
        });
        const verified = await this.provider.get(access, created.providerWebhookId);

        if (!this.isExpected(verified, callbackUrl)) {
          return this.persistStatus(
            repository,
            capability,
            "FAILED",
            "WEBHOOK_CONFIGURATION_INVALID",
            false,
            created.providerWebhookId
          );
        }

        return this.persistEnabled(repository, capability, verified, "WEBHOOK_CREATED");
      } catch (error) {
        return this.persistProviderFailure(repository, capability, error);
      }
    });
  }

  async cleanup(user: AuthenticatedUser, repositoryId: string): Promise<boolean> {
    return this.locks.withLocks([repositoryAutomationLock(repositoryId)], async () => {
      const repository = await this.requireOwnedRepository(user.id, repositoryId);
      const result = await this.cleanupManagedWebhook(user.id, repository);

      return result.completed;
    });
  }

  async disable(
    user: AuthenticatedUser,
    repositoryId: string
  ): Promise<RepositoryAutomationStatus> {
    return this.locks.withLocks([repositoryAutomationLock(repositoryId)], async () => {
      const repository = await this.requireOwnedRepository(user.id, repositoryId);
      const result = await this.cleanupManagedWebhook(user.id, repository);
      const capability = await this.resolveCapability(user.id, repository);

      if (!result.completed) {
        return this.status(capability, result.webhook);
      }

      return repositoryAutomationStatus(capability, "NOT_CONFIGURED", {
        lastOutcome: result.outcome,
        lastVerifiedAt: new Date()
      });
    });
  }

  private async ensureConfigured(
    repository: OwnedRepository,
    capability: RepositoryAutomationCapability,
    access: RepositoryWebhookProviderAccess,
    remote: RepositoryWebhook,
    secret: string,
    callbackUrl: string,
    secretKnownCurrent: boolean
  ) {
    if (this.isExpected(remote, callbackUrl) && secretKnownCurrent) {
      return this.persistEnabled(repository, capability, remote, "WEBHOOK_ALREADY_CONFIGURED");
    }

    const updated = await this.provider.update({
      ...access,
      ...this.expectedConfiguration(callbackUrl),
      providerWebhookId: remote.providerWebhookId,
      secret
    });
    const verified = await this.provider.get(access, updated.providerWebhookId);

    if (!this.isExpected(verified, callbackUrl)) {
      return this.persistStatus(
        repository,
        capability,
        "FAILED",
        "WEBHOOK_CONFIGURATION_INVALID",
        false,
        updated.providerWebhookId
      );
    }

    return this.persistEnabled(repository, capability, verified, "WEBHOOK_UPDATED");
  }

  private async persistEnabled(
    repository: OwnedRepository,
    capability: RepositoryAutomationCapability,
    remote: RepositoryWebhook,
    outcome: RepositoryWebhookProvisioningOutcome
  ) {
    return this.persistStatus(
      repository,
      capability,
      "ENABLED",
      outcome,
      true,
      remote.providerWebhookId
    );
  }

  private async persistCapabilityFailure(
    repository: OwnedRepository,
    capability: RepositoryAutomationCapability
  ) {
    if (capability === "CANNOT_MANAGE_WEBHOOK") {
      return this.persistStatus(
        repository,
        capability,
        "REQUIRES_ADMIN",
        "WEBHOOK_NOT_AUTHORIZED",
        false
      );
    }
    if (
      capability === "PROVIDER_ACCESS_DENIED" ||
      capability === "PROVIDER_AUTHORIZATION_REQUIRED"
    ) {
      return this.persistStatus(
        repository,
        capability,
        "REQUIRES_AUTHORIZATION",
        "WEBHOOK_NOT_AUTHORIZED",
        false
      );
    }
    if (capability === "PROVIDER_UNAVAILABLE") {
      return this.persistStatus(
        repository,
        capability,
        "UNAVAILABLE",
        "WEBHOOK_PROVIDER_UNAVAILABLE",
        false
      );
    }
    return this.persistStatus(repository, capability, "FAILED", "WEBHOOK_NOT_FOUND", false);
  }

  private async persistProviderFailure(
    repository: OwnedRepository,
    capability: RepositoryAutomationCapability,
    error: unknown
  ) {
    if (error instanceof RepositoryWebhookProviderError) {
      if (error.failure === "ACCESS_DENIED" || error.failure === "AUTHORIZATION_REQUIRED") {
        return this.persistStatus(
          repository,
          capability,
          "REQUIRES_AUTHORIZATION",
          "WEBHOOK_NOT_AUTHORIZED",
          false
        );
      }
      if (error.failure === "PROVIDER_UNAVAILABLE") {
        return this.persistStatus(
          repository,
          capability,
          "UNAVAILABLE",
          "WEBHOOK_PROVIDER_UNAVAILABLE",
          false
        );
      }
      if (error.failure === "CONFIGURATION_INVALID") {
        return this.persistStatus(
          repository,
          capability,
          "FAILED",
          "WEBHOOK_CONFIGURATION_INVALID",
          false
        );
      }
      if (error.failure === "NOT_FOUND") {
        return this.persistStatus(repository, capability, "FAILED", "WEBHOOK_NOT_FOUND", false);
      }
    }
    return this.persistStatus(repository, capability, "FAILED", "WEBHOOK_UNKNOWN_FAILURE", false);
  }

  private async persistStatus(
    repository: OwnedRepository,
    capability: RepositoryAutomationCapability,
    provisioningStatus: RepositoryWebhookProvisioningStatus,
    lastOutcome: RepositoryWebhookProvisioningOutcome,
    active: boolean,
    providerWebhookId?: string
  ): Promise<RepositoryAutomationStatus> {
    const lastVerifiedAt = active ? new Date() : null;
    const secretFingerprint = active
      ? this.secretFingerprint(this.config.githubWebhookSecret ?? "")
      : undefined;
    const webhook = await this.prisma.repositoryWebhook.upsert({
      where: { repositoryId: repository.id },
      create: {
        repositoryId: repository.id,
        provider: "GITHUB",
        callbackUrl: this.config.githubWebhookCallbackUrl ?? "",
        subscribedEvents: EXPECTED_EVENTS,
        provisioningStatus,
        lastOutcome,
        active,
        ...(providerWebhookId ? { providerWebhookId } : {}),
        lastProvisioningAttemptAt: new Date(),
        lastVerifiedAt,
        ...(secretFingerprint ? { secretFingerprint } : {})
      },
      update: {
        callbackUrl: this.config.githubWebhookCallbackUrl ?? "",
        subscribedEvents: EXPECTED_EVENTS,
        provisioningStatus,
        lastOutcome,
        active,
        ...(providerWebhookId ? { providerWebhookId } : {}),
        lastProvisioningAttemptAt: new Date(),
        lastVerifiedAt,
        ...(secretFingerprint ? { secretFingerprint } : {})
      }
    });

    return this.status(capability, webhook);
  }

  private status(
    capability: RepositoryAutomationCapability,
    webhook: {
      provisioningStatus: RepositoryWebhookProvisioningStatus;
      lastOutcome: RepositoryWebhookProvisioningOutcome | null;
      lastVerifiedAt: Date | null;
    } | null
  ) {
    return repositoryAutomationStatus(capability, webhook?.provisioningStatus ?? "NOT_CONFIGURED", {
      lastOutcome: webhook?.lastOutcome ?? null,
      lastVerifiedAt: webhook?.lastVerifiedAt ?? null
    });
  }

  private isOwnedCandidate(hook: RepositoryWebhook, callbackUrl: string) {
    return (
      hook.callbackUrl === callbackUrl &&
      hook.contentType === "json" &&
      hook.insecureSsl === "0" &&
      this.hasOnlyPushEvent(hook.events)
    );
  }

  private isExpected(hook: RepositoryWebhook, callbackUrl: string) {
    return hook.active && this.isOwnedCandidate(hook, callbackUrl);
  }

  private hasOnlyPushEvent(events: string[]) {
    return events.length === 1 && events[0] === "push";
  }

  private expectedConfiguration(callbackUrl: string) {
    return {
      active: true,
      callbackUrl,
      contentType: "json",
      events: [...EXPECTED_EVENTS],
      insecureSsl: "0"
    };
  }

  private providerAccess(repository: OwnedRepository, token: string) {
    return {
      authorization: { bearerToken: token },
      name: repository.name,
      owner: repository.owner
    };
  }

  private async accessToken(userId: string) {
    return this.accounts.getAccessTokenForUser(userId);
  }

  private async resolveCapability(
    userId: string,
    repository: OwnedRepository
  ): Promise<RepositoryAutomationCapability> {
    try {
      const token = await this.accessToken(userId);
      return (await this.repositories.checkWebhookManagementCapability(token, repository))
        .capability;
    } catch (error) {
      return error instanceof UnauthorizedException
        ? "PROVIDER_ACCESS_DENIED"
        : "PROVIDER_UNAVAILABLE";
    }
  }

  private secretFingerprint(secret: string) {
    return createHash("sha256").update(secret).digest("hex");
  }

  private async requireOwnedRepository(
    userId: string,
    repositoryId: string
  ): Promise<OwnedRepository> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
      select: { id: true, userId: true, githubId: true, owner: true, name: true }
    });

    if (!repository) {
      throw new NotFoundException("Repository was not found");
    }

    return repository;
  }

  private isProviderFailure(error: unknown, failure: RepositoryWebhookProviderError["failure"]) {
    return error instanceof RepositoryWebhookProviderError && error.failure === failure;
  }

  private async cleanupManagedWebhook(
    userId: string,
    repository: OwnedRepository
  ): Promise<CleanupResult> {
    const webhook = await this.prisma.repositoryWebhook.findUnique({
      where: { repositoryId: repository.id }
    });

    if (!webhook?.providerWebhookId) {
      if (webhook) {
        await this.prisma.repositoryWebhook.delete({ where: { repositoryId: repository.id } });
      }
      return { completed: true, outcome: "WEBHOOK_ALREADY_DELETED" };
    }

    const token = await this.accessToken(userId).catch(() => null);
    if (!token) {
      return {
        completed: false,
        webhook: await this.markCleanupPending(repository.id)
      };
    }

    try {
      await this.provider.delete(this.providerAccess(repository, token), webhook.providerWebhookId);
      await this.prisma.repositoryWebhook.delete({ where: { repositoryId: repository.id } });
      return { completed: true, outcome: "WEBHOOK_DELETED" };
    } catch (error) {
      if (this.isProviderFailure(error, "NOT_FOUND")) {
        await this.prisma.repositoryWebhook.delete({ where: { repositoryId: repository.id } });
        return { completed: true, outcome: "WEBHOOK_ALREADY_DELETED" };
      }
      return {
        completed: false,
        webhook: await this.markCleanupPending(repository.id)
      };
    }
  }

  private markCleanupPending(repositoryId: string) {
    return this.prisma.repositoryWebhook.update({
      where: { repositoryId },
      data: {
        provisioningStatus: "CLEANUP_PENDING",
        active: false,
        lastOutcome: "WEBHOOK_CLEANUP_PENDING",
        lastProvisioningAttemptAt: new Date()
      }
    });
  }
}
