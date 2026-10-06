import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import type { DependencyDeclaration, DependencySnapshot } from "../domain/dependency-snapshot.js";
import type { DependencySnapshotReader } from "../domain/contracts/dependency-snapshot-reader.contract.js";
import { InvalidDependencySnapshotInputError } from "../domain/errors/invalid-dependency-snapshot-input.error.js";

@Injectable()
export class PrismaDependencySnapshotReader implements DependencySnapshotReader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async readCurrent(repositoryId: string): Promise<DependencySnapshot | null> {
    const state = await this.prisma.repositoryState.findFirst({
      where: { repositoryId },
      select: {
        currentProjectContext: {
          select: {
            id: true,
            repositoryId: true,
            analysisId: true,
            commitSha: true,
            contextVersion: true,
            repositoryContextHistory: {
              where: { repositoryId },
              select: { id: true },
              take: 1
            },
            analysis: {
              select: {
                id: true,
                repositoryId: true,
                commitSha: true,
                analyzerVersion: true,
                status: true,
                project: true
              }
            }
          }
        }
      }
    });
    const context = state?.currentProjectContext;
    if (!context) return null;

    const analysis = context.analysis;
    if (
      context.repositoryId !== repositoryId ||
      context.repositoryContextHistory.length === 0 ||
      analysis.id !== context.analysisId ||
      analysis.repositoryId !== repositoryId ||
      analysis.commitSha !== context.commitSha ||
      analysis.status !== "COMPLETED"
    ) {
      throw invalid("Current ProjectContext and Analysis provenance is inconsistent.");
    }
    for (const [field, value] of [
      ["projectContextId", context.id],
      ["analysisId", context.analysisId],
      ["commitSha", context.commitSha],
      ["contextVersion", context.contextVersion],
      ["analyzerVersion", analysis.analyzerVersion]
    ] as const) {
      if (value.length === 0) throw invalid(`${field} is missing.`);
    }

    const project = record(analysis.project, "Analysis.project");
    const declarations = array(project.dependencies, "Analysis.project.dependencies")
      .map(parseDeclaration)
      .sort(compareDeclarations);

    return {
      repositoryId,
      projectContextId: context.id,
      analysisId: context.analysisId,
      commitSha: context.commitSha,
      analyzerVersion: analysis.analyzerVersion,
      contextVersion: context.contextVersion,
      declarations
    };
  }
}

function parseDeclaration(value: unknown, index: number): DependencyDeclaration {
  const declaration = record(value, `Analysis.project.dependencies.${index}`);
  return {
    manifestPath: nonEmptyString(declaration.manifestPath, `Dependency ${index}.manifestPath`),
    packageName: nonEmptyString(declaration.name, `Dependency ${index}.name`),
    declaredVersion: nonEmptyString(declaration.version, `Dependency ${index}.version`),
    dependencyType: dependencyType(declaration.type, index)
  };
}

function dependencyType(value: unknown, index: number): DependencyDeclaration["dependencyType"] {
  if (
    value === "DEPENDENCY" ||
    value === "DEV_DEPENDENCY" ||
    value === "PEER_DEPENDENCY" ||
    value === "OPTIONAL_DEPENDENCY"
  ) {
    return value;
  }
  throw invalid(`Dependency ${index}.type is invalid.`);
}

function compareDeclarations(left: DependencyDeclaration, right: DependencyDeclaration): number {
  return (
    left.manifestPath.localeCompare(right.manifestPath) ||
    left.packageName.localeCompare(right.packageName) ||
    left.dependencyType.localeCompare(right.dependencyType) ||
    left.declaredVersion.localeCompare(right.declaredVersion)
  );
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw invalid(`${label} must be an array.`);
  return value;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw invalid(`${label} must be a non-empty string.`);
  }
  return value;
}

function invalid(message: string): InvalidDependencySnapshotInputError {
  return new InvalidDependencySnapshotInputError(message);
}
