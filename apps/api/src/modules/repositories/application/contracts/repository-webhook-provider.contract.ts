export const REPOSITORY_WEBHOOK_PROVIDER = Symbol("REPOSITORY_WEBHOOK_PROVIDER");

export type RepositoryWebhookProviderAccess = {
  authorization: unknown;
  name: string;
  owner: string;
};

export type RepositoryWebhookConfiguration = {
  active: boolean;
  callbackUrl: string;
  contentType: string;
  events: string[];
  insecureSsl: string;
};

export type RepositoryWebhook = RepositoryWebhookConfiguration & {
  providerWebhookId: string;
};

export type CreateRepositoryWebhookInput = RepositoryWebhookProviderAccess &
  RepositoryWebhookConfiguration & {
    secret: string;
  };

export type UpdateRepositoryWebhookInput = CreateRepositoryWebhookInput & {
  providerWebhookId: string;
};

export interface RepositoryWebhookProvider {
  create(input: CreateRepositoryWebhookInput): Promise<RepositoryWebhook>;
  get(
    access: RepositoryWebhookProviderAccess,
    providerWebhookId: string
  ): Promise<RepositoryWebhook>;
  list(access: RepositoryWebhookProviderAccess): Promise<RepositoryWebhook[]>;
  update(input: UpdateRepositoryWebhookInput): Promise<RepositoryWebhook>;
  delete(access: RepositoryWebhookProviderAccess, providerWebhookId: string): Promise<void>;
}
