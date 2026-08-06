import type {
  RepositoryContentCommit,
  RepositoryContentFile,
  RepositoryContentProvider,
  RepositoryAccess
} from "../domain/contracts/repository-content-provider.contract.js";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

type GitHubCommitResponse = {
  sha: string;
};

type GitHubGitCommitResponse = {
  tree: {
    sha: string;
  };
};

type GitHubRepositoryResponse = {
  default_branch: string;
};

type GitHubTreeEntry = {
  path: string;
  sha: string;
  type: string;
  size?: number;
};

type GitHubTreeResponse = {
  tree: GitHubTreeEntry[];
  truncated: boolean;
};

const BINARY_EXTENSIONS = new Set([
  "7z",
  "avif",
  "bmp",
  "class",
  "dll",
  "dmg",
  "doc",
  "docx",
  "eot",
  "exe",
  "gif",
  "gz",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "otf",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "psd",
  "rar",
  "so",
  "tar",
  "ttf",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "zip"
]);

export class GitHubRepositoryContentProvider implements RepositoryContentProvider {
  async resolveCommit(access: RepositoryAccess): Promise<RepositoryContentCommit> {
    const reference = access.reference ?? (await this.resolveDefaultReference(access));
    const commit = this.parseCommit(
      await this.requestJson(
        this.repositoryUrl(access, `commits/${encodeURIComponent(reference)}`),
        access
      )
    );

    return {
      commitSha: commit.sha
    };
  }

  async *listSnapshotFiles(
    access: RepositoryAccess,
    commitSha: string
  ): AsyncIterable<RepositoryContentFile> {
    const rootTreeSha = await this.resolveCommitTreeSha(access, commitSha);
    const treeStack = [{ pathPrefix: "", treeSha: rootTreeSha }];

    while (treeStack.length > 0) {
      const currentTree = treeStack.pop();

      if (!currentTree) {
        continue;
      }

      const tree = await this.loadTree(access, currentTree.treeSha);

      for (const entry of tree.tree) {
        const path = this.joinPath(currentTree.pathPrefix, entry.path);

        if (entry.type === "tree") {
          treeStack.push({ pathPrefix: path, treeSha: entry.sha });
          continue;
        }

        if (entry.type === "blob") {
          yield this.mapTreeEntry(entry, path);
        }
      }
    }
  }

  private async resolveDefaultReference(access: RepositoryAccess): Promise<string> {
    const repository = this.parseRepository(
      await this.requestJson(this.repositoryUrl(access), access)
    );

    return repository.default_branch;
  }

  private async resolveCommitTreeSha(access: RepositoryAccess, commitSha: string): Promise<string> {
    const commit = this.parseGitCommit(
      await this.requestJson(
        this.repositoryUrl(access, `git/commits/${encodeURIComponent(commitSha)}`),
        access
      )
    );

    return commit.tree.sha;
  }

  private async loadTree(access: RepositoryAccess, treeSha: string): Promise<GitHubTreeResponse> {
    const tree = this.parseTree(
      await this.requestJson(
        this.repositoryUrl(access, `git/trees/${encodeURIComponent(treeSha)}`),
        access
      )
    );

    if (tree.truncated) {
      throw new Error("GitHub repository tree response was truncated.");
    }

    return tree;
  }

  private mapTreeEntry(entry: GitHubTreeEntry, path: string): RepositoryContentFile {
    const extension = this.getExtension(path);

    return {
      path,
      extension,
      size: BigInt(entry.size ?? 0),
      sha: entry.sha,
      isBinary: extension ? BINARY_EXTENSIONS.has(extension) : false,
      isHidden: this.isHiddenPath(path)
    };
  }

  private repositoryUrl(access: RepositoryAccess, path?: string): string {
    const basePath = `repos/${encodeURIComponent(access.owner)}/${encodeURIComponent(access.name)}`;
    const repositoryPath = path ? `${basePath}/${path}` : basePath;

    return `${GITHUB_API_BASE_URL}/${repositoryPath}`;
  }

  private async requestJson(url: string, access: RepositoryAccess): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${access.accessToken}`,
          "User-Agent": "ai-project-context-platform",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`GitHub request failed with status ${response.status}.`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseCommit(payload: unknown): GitHubCommitResponse {
    if (!this.isRecord(payload) || typeof payload.sha !== "string") {
      throw new Error("GitHub commit response could not be validated.");
    }

    return { sha: payload.sha };
  }

  private parseGitCommit(payload: unknown): GitHubGitCommitResponse {
    if (
      !this.isRecord(payload) ||
      !this.isRecord(payload.tree) ||
      typeof payload.tree.sha !== "string"
    ) {
      throw new Error("GitHub git commit response could not be validated.");
    }

    return { tree: { sha: payload.tree.sha } };
  }

  private parseRepository(payload: unknown): GitHubRepositoryResponse {
    if (!this.isRecord(payload) || typeof payload.default_branch !== "string") {
      throw new Error("GitHub repository response could not be validated.");
    }

    return { default_branch: payload.default_branch };
  }

  private parseTree(payload: unknown): GitHubTreeResponse {
    if (!this.isRecord(payload) || !Array.isArray(payload.tree)) {
      throw new Error("GitHub tree response could not be validated.");
    }

    return {
      tree: payload.tree.map((entry) => this.parseTreeEntry(entry)),
      truncated: payload.truncated === true
    };
  }

  private parseTreeEntry(payload: unknown): GitHubTreeEntry {
    if (
      !this.isRecord(payload) ||
      typeof payload.path !== "string" ||
      typeof payload.sha !== "string" ||
      typeof payload.type !== "string"
    ) {
      throw new Error("GitHub tree entry could not be validated.");
    }

    if (payload.size !== undefined && typeof payload.size !== "number") {
      throw new Error("GitHub tree entry size could not be validated.");
    }

    return {
      path: payload.path,
      sha: payload.sha,
      type: payload.type,
      ...(payload.size === undefined ? {} : { size: payload.size })
    };
  }

  private getExtension(path: string): string | null {
    const filename = path.split("/").at(-1) ?? path;
    const dotIndex = filename.lastIndexOf(".");

    if (dotIndex <= 0 || dotIndex === filename.length - 1) {
      return null;
    }

    return filename.slice(dotIndex + 1).toLowerCase();
  }

  private isHiddenPath(path: string): boolean {
    return path.split("/").some((segment) => segment.startsWith(".") && segment.length > 1);
  }

  private joinPath(prefix: string, path: string): string {
    return prefix ? `${prefix}/${path}` : path;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
