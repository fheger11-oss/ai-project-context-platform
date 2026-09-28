import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

import type { PrismaService } from "../../prisma/prisma.service.js";
import type { OperationLockService } from "../../usage/operation-lock.service.js";
import type { GitHubAccountService } from "../../auth/providers/github-account.service.js";
import type { AppConfigService } from "../../config/app-config.service.js";
import type {
  RepositoryWebhook,
  RepositoryWebhookProvider
} from "./contracts/repository-webhook-provider.contract.js";
import { RepositoryWebhookProviderError } from "../domain/repository-webhook-provider.error.js";
import type { GitHubRepositoryProvider } from "../providers/github-repository.provider.js";
import { RepositoryWebhookProvisioningService } from "./repository-webhook-provisioning.service.js";

const user = { id: "user_1", email: "owner@example.com", role: "USER" as const, tenantId: null };
const repository = {
  id: "repository_1",
  userId: user.id,
  githubId: "123",
  owner: "owner",
  name: "repository"
};
const callbackUrl = "https://api.ctxaro.test/api/v1/webhooks/github";

type LocalWebhook = {
  repositoryId: string;
  providerWebhookId: string | null;
  provisioningStatus: string;
  lastOutcome: string | null;
  lastVerifiedAt: Date | null;
  active: boolean;
  callbackUrl: string;
  secretFingerprint?: string | null;
};

function remote(overrides: Partial<RepositoryWebhook> = {}): RepositoryWebhook {
  return {
    providerWebhookId: "42",
    active: true,
    callbackUrl,
    contentType: "json",
    events: ["push"],
    insecureSsl: "0",
    ...overrides
  };
}

function harness(
  options: {
    capability?: string;
    local?: LocalWebhook | null;
    hooks?: RepositoryWebhook[];
    provider?: Partial<RepositoryWebhookProvider>;
    tokenFailure?: Error;
    repositoryFound?: boolean;
  } = {}
) {
  let local = options.local ?? null;
  const upsert = vi.fn(
    async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
      local = {
        repositoryId: repository.id,
        providerWebhookId: local?.providerWebhookId ?? null,
        provisioningStatus: "NOT_CONFIGURED",
        lastOutcome: null,
        lastVerifiedAt: null,
        active: false,
        callbackUrl,
        ...(local ?? {}),
        ...(local ? args.update : args.create)
      } as LocalWebhook;
      return local;
    }
  );
  const update = vi.fn(async (args: { data: Record<string, unknown> }) => {
    local = { ...local!, ...args.data } as LocalWebhook;
    return local;
  });
  const deleteLocal = vi.fn(async () => {
    local = null;
  });
  const prisma = {
    repository: {
      findFirst: vi.fn().mockResolvedValue(options.repositoryFound === false ? null : repository)
    },
    repositoryWebhook: {
      findUnique: vi.fn(async () => local),
      upsert,
      update,
      delete: deleteLocal
    }
  } as unknown as PrismaService;
  const create = vi.fn().mockResolvedValue(remote());
  const get = vi.fn().mockResolvedValue(remote());
  const list = vi.fn().mockResolvedValue(options.hooks ?? []);
  const updateRemote = vi.fn().mockResolvedValue(remote());
  const deleteRemote = vi.fn().mockResolvedValue(undefined);
  const provider = {
    create,
    get,
    list,
    update: updateRemote,
    delete: deleteRemote,
    ...options.provider
  } as RepositoryWebhookProvider;
  const accounts = {
    getAccessTokenForUser: options.tokenFailure
      ? vi.fn().mockRejectedValue(options.tokenFailure)
      : vi.fn().mockResolvedValue("provider-token")
  } as unknown as GitHubAccountService;
  const repositories = {
    checkWebhookManagementCapability: vi.fn().mockResolvedValue({
      capability: options.capability ?? "CAN_MANAGE_WEBHOOK",
      permissions: { admin: options.capability !== "CANNOT_MANAGE_WEBHOOK" }
    })
  } as unknown as GitHubRepositoryProvider;
  const config = {
    githubWebhookCallbackUrl: callbackUrl,
    githubWebhookSecret: "global-transition-secret"
  } as AppConfigService;
  const locks = {
    withLocks: vi.fn(async (_locks, operation: () => Promise<unknown>) => operation())
  } as unknown as OperationLockService;

  return {
    service: new RepositoryWebhookProvisioningService(
      prisma,
      accounts,
      repositories,
      provider,
      config,
      locks
    ),
    provider: { create, get, list, update: updateRemote, delete: deleteRemote },
    upsert,
    deleteLocal,
    local: () => local
  };
}

describe("RepositoryWebhookProvisioningService", () => {
  it("enforces repository ownership before any provider mutation", async () => {
    const test = harness({ repositoryFound: false });

    await expect(test.service.reconcile(user, repository.id)).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(test.provider.list).not.toHaveBeenCalled();
    expect(test.provider.create).not.toHaveBeenCalled();
  });

  it("creates and verifies a webhook for an admin repository", async () => {
    const test = harness();

    await expect(test.service.reconcile(user, repository.id)).resolves.toMatchObject({
      automaticUpdates: {
        capability: "CAN_MANAGE_WEBHOOK",
        configuration: "ENABLED",
        enabled: true,
        lastOutcome: "WEBHOOK_CREATED"
      }
    });
    expect(test.provider.create).toHaveBeenCalledOnce();
    expect(test.provider.get).toHaveBeenCalledWith(expect.anything(), "42");
    expect(test.local()?.providerWebhookId).toBe("42");
  });

  it("does not mutate GitHub when repository admin authority is absent", async () => {
    const test = harness({ capability: "CANNOT_MANAGE_WEBHOOK" });

    await expect(test.service.reconcile(user, repository.id)).resolves.toMatchObject({
      automaticUpdates: { configuration: "REQUIRES_ADMIN", enabled: false }
    });
    expect(test.provider.list).not.toHaveBeenCalled();
    expect(test.provider.create).not.toHaveBeenCalled();
  });

  it("reuses a durably identified valid Ctxaro hook", async () => {
    const test = harness({
      local: {
        repositoryId: repository.id,
        providerWebhookId: "42",
        provisioningStatus: "ENABLED",
        lastOutcome: "WEBHOOK_CREATED",
        lastVerifiedAt: new Date(),
        active: true,
        callbackUrl,
        secretFingerprint: createHash("sha256").update("global-transition-secret").digest("hex")
      }
    });

    await expect(test.service.reconcile(user, repository.id)).resolves.toMatchObject({
      automaticUpdates: { enabled: true, lastOutcome: "WEBHOOK_ALREADY_CONFIGURED" }
    });
    expect(test.provider.create).not.toHaveBeenCalled();
    expect(test.provider.update).not.toHaveBeenCalled();
  });

  it("updates an adopted callback-matching hook whose configuration or secret is unverified", async () => {
    const inactive = remote({ active: false });
    const test = harness({ hooks: [inactive] });

    await expect(test.service.reconcile(user, repository.id)).resolves.toMatchObject({
      automaticUpdates: { enabled: true, lastOutcome: "WEBHOOK_UPDATED" }
    });
    expect(test.provider.update).toHaveBeenCalledWith(
      expect.objectContaining({ providerWebhookId: "42", active: true, secret: expect.any(String) })
    );
  });

  it("recovers a stale stored hook ID by listing before creating", async () => {
    const test = harness({
      local: {
        repositoryId: repository.id,
        providerWebhookId: "stale",
        provisioningStatus: "ENABLED",
        lastOutcome: "WEBHOOK_CREATED",
        lastVerifiedAt: new Date(),
        active: true,
        callbackUrl
      },
      hooks: [remote()],
      provider: {
        get: vi
          .fn()
          .mockRejectedValueOnce(new RepositoryWebhookProviderError("NOT_FOUND"))
          .mockResolvedValueOnce(remote())
      }
    });

    await expect(test.service.reconcile(user, repository.id)).resolves.toMatchObject({
      automaticUpdates: { enabled: true }
    });
    expect(test.provider.list).toHaveBeenCalledOnce();
    expect(test.provider.create).not.toHaveBeenCalled();
    expect(test.local()?.providerWebhookId).toBe("42");
  });

  it("is idempotent across repeated reconcile calls", async () => {
    const test = harness();
    await test.service.reconcile(user, repository.id);
    await test.service.reconcile(user, repository.id);

    expect(test.provider.create).toHaveBeenCalledOnce();
    expect(test.local()?.providerWebhookId).toBe("42");
  });

  it("keeps the repository connected and reports provider unavailability", async () => {
    const test = harness({
      provider: {
        list: vi.fn().mockRejectedValue(new RepositoryWebhookProviderError("PROVIDER_UNAVAILABLE"))
      }
    });

    await expect(test.service.reconcile(user, repository.id)).resolves.toMatchObject({
      automaticUpdates: { configuration: "UNAVAILABLE", enabled: false }
    });
    expect(test.local()).not.toBeNull();
  });

  it("does not create a hook when provider authorization is unavailable", async () => {
    const test = harness({ capability: "PROVIDER_AUTHORIZATION_REQUIRED" });

    await expect(test.service.reconcile(user, repository.id)).resolves.toMatchObject({
      automaticUpdates: { configuration: "REQUIRES_AUTHORIZATION", enabled: false }
    });
    expect(test.provider.create).not.toHaveBeenCalled();
  });

  it("does not adopt, mutate, or delete an unrelated hook", async () => {
    const unrelated = remote({ providerWebhookId: "99", callbackUrl: "https://example.test/hook" });
    const test = harness({ hooks: [unrelated] });

    await test.service.reconcile(user, repository.id);

    expect(test.provider.update).not.toHaveBeenCalled();
    expect(test.provider.delete).not.toHaveBeenCalled();
    expect(test.provider.create).toHaveBeenCalledOnce();
  });

  it("deletes only the durably stored Ctxaro hook during cleanup", async () => {
    const test = harness({
      local: {
        repositoryId: repository.id,
        providerWebhookId: "42",
        provisioningStatus: "ENABLED",
        lastOutcome: "WEBHOOK_CREATED",
        lastVerifiedAt: new Date(),
        active: true,
        callbackUrl
      }
    });

    await expect(test.service.cleanup(user, repository.id)).resolves.toBe(true);
    expect(test.provider.delete).toHaveBeenCalledWith(expect.anything(), "42");
    expect(test.deleteLocal).toHaveBeenCalledOnce();
  });

  it("treats a remote 404 during cleanup as already deleted", async () => {
    const test = harness({
      local: {
        repositoryId: repository.id,
        providerWebhookId: "42",
        provisioningStatus: "ENABLED",
        lastOutcome: "WEBHOOK_CREATED",
        lastVerifiedAt: new Date(),
        active: true,
        callbackUrl
      },
      provider: {
        delete: vi.fn().mockRejectedValue(new RepositoryWebhookProviderError("NOT_FOUND"))
      }
    });

    await expect(test.service.cleanup(user, repository.id)).resolves.toBe(true);
    expect(test.deleteLocal).toHaveBeenCalledOnce();
  });

  it("records cleanup pending when the remote provider is unavailable", async () => {
    const test = harness({
      local: {
        repositoryId: repository.id,
        providerWebhookId: "42",
        provisioningStatus: "ENABLED",
        lastOutcome: "WEBHOOK_CREATED",
        lastVerifiedAt: new Date(),
        active: true,
        callbackUrl
      },
      provider: {
        delete: vi
          .fn()
          .mockRejectedValue(new RepositoryWebhookProviderError("PROVIDER_UNAVAILABLE"))
      }
    });

    await expect(test.service.cleanup(user, repository.id)).resolves.toBe(false);
    expect(test.local()).toMatchObject({
      provisioningStatus: "CLEANUP_PENDING",
      lastOutcome: "WEBHOOK_CLEANUP_PENDING",
      active: false
    });
    expect(test.deleteLocal).not.toHaveBeenCalled();
  });
});
