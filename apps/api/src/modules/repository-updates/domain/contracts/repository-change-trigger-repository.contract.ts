export const REPOSITORY_CHANGE_TRIGGER_REPOSITORY = Symbol("REPOSITORY_CHANGE_TRIGGER_REPOSITORY");

export type ConnectedRepositoryTriggerMetadata = {
  id: string;
  userId: string;
  providerRepositoryId: string;
  fullName: string;
  defaultBranch: string;
};

export interface RepositoryChangeTriggerRepository {
  findConnectedById(repositoryId: string): Promise<ConnectedRepositoryTriggerMetadata | null>;
}
