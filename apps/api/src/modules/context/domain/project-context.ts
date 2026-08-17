import type { ContextClaim } from "./context-claim.js";
import { InvalidProjectContextProvenanceError } from "./errors/invalid-project-context-provenance.error.js";

export type ProjectContextProvenance = {
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: Date;
};

export type ContextSection = {
  claims: readonly ContextClaim[];
};

export type ProjectContextSections = {
  project: ContextSection;
  technology: ContextSection;
  structure: ContextSection;
  architecture: ContextSection;
  entryPoints: ContextSection;
  testing: ContextSection;
  infrastructure: ContextSection;
  ambiguities: readonly ContextClaim[];
};

export type ProjectContextSnapshot = ProjectContextProvenance & ProjectContextSections;

export type CreateProjectContextInput = ProjectContextProvenance & Partial<ProjectContextSections>;

const EMPTY_SECTION: ContextSection = { claims: [] };

export class ProjectContext {
  private constructor(private readonly snapshot: ProjectContextSnapshot) {}

  static create(input: CreateProjectContextInput): ProjectContext {
    assertRequiredProvenance(input);

    return new ProjectContext({
      contextId: input.contextId,
      analysisId: input.analysisId,
      scanId: input.scanId,
      repositoryId: input.repositoryId,
      commitSha: input.commitSha,
      contextVersion: input.contextVersion,
      generatedAt: input.generatedAt,
      project: input.project ?? EMPTY_SECTION,
      technology: input.technology ?? EMPTY_SECTION,
      structure: input.structure ?? EMPTY_SECTION,
      architecture: input.architecture ?? EMPTY_SECTION,
      entryPoints: input.entryPoints ?? EMPTY_SECTION,
      testing: input.testing ?? EMPTY_SECTION,
      infrastructure: input.infrastructure ?? EMPTY_SECTION,
      ambiguities: input.ambiguities ?? []
    });
  }

  static fromSnapshot(snapshot: ProjectContextSnapshot): ProjectContext {
    assertRequiredProvenance(snapshot);

    return new ProjectContext({ ...snapshot });
  }

  get contextId(): string {
    return this.snapshot.contextId;
  }

  get analysisId(): string {
    return this.snapshot.analysisId;
  }

  get scanId(): string {
    return this.snapshot.scanId;
  }

  get repositoryId(): string {
    return this.snapshot.repositoryId;
  }

  get commitSha(): string {
    return this.snapshot.commitSha;
  }

  get contextVersion(): string {
    return this.snapshot.contextVersion;
  }

  get generatedAt(): Date {
    return this.snapshot.generatedAt;
  }

  toSnapshot(): ProjectContextSnapshot {
    return { ...this.snapshot };
  }
}

function assertRequiredProvenance(input: ProjectContextProvenance): void {
  for (const field of [
    "contextId",
    "analysisId",
    "scanId",
    "repositoryId",
    "commitSha",
    "contextVersion"
  ] as const) {
    if (input[field].trim().length === 0) {
      throw new InvalidProjectContextProvenanceError(field);
    }
  }

  if (!(input.generatedAt instanceof Date)) {
    throw new InvalidProjectContextProvenanceError("generatedAt");
  }
}
