export const DEPENDENCY_HISTORY_READER = Symbol("DEPENDENCY_HISTORY_READER");

export type DependencyPromotedContextReference = {
  historyId: string;
  projectContextId: string;
  promotedAt: Date;
};

export interface DependencyHistoryReader {
  listThroughCurrent(
    repositoryId: string,
    currentProjectContextId: string
  ): Promise<readonly DependencyPromotedContextReference[]>;
}
