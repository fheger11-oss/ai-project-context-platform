import type {
  PackageDependency,
  PackageDependencyType,
  PackageJsonPackage,
  ProjectDetectionIssue
} from "./project-profile.js";

export type ParsedPackageJson =
  | {
      status: "PARSED";
      packageJson: PackageJsonPackage;
    }
  | {
      status: "MALFORMED";
      issue: ProjectDetectionIssue;
    };

const DEPENDENCY_SECTIONS: ReadonlyArray<{
  field: string;
  type: PackageDependencyType;
}> = [
  { field: "dependencies", type: "DEPENDENCY" },
  { field: "devDependencies", type: "DEV_DEPENDENCY" },
  { field: "peerDependencies", type: "PEER_DEPENDENCY" },
  { field: "optionalDependencies", type: "OPTIONAL_DEPENDENCY" }
];

export class PackageJsonParser {
  parse(input: { path: string; content: string; isPrimary: boolean }): ParsedPackageJson {
    let payload: unknown;

    try {
      payload = JSON.parse(input.content);
    } catch {
      return this.malformed(input.path);
    }

    if (!this.isRecord(payload)) {
      return this.malformed(input.path);
    }

    const dependencies = DEPENDENCY_SECTIONS.flatMap(({ field, type }) =>
      this.parseDependencySection(input.path, payload[field], type)
    );

    return {
      status: "PARSED",
      packageJson: {
        path: input.path,
        isPrimary: input.isPrimary,
        name: typeof payload.name === "string" ? payload.name : null,
        version: typeof payload.version === "string" ? payload.version : null,
        dependencies
      }
    };
  }

  private parseDependencySection(
    manifestPath: string,
    value: unknown,
    type: PackageDependencyType
  ): PackageDependency[] {
    if (!this.isRecord(value)) {
      return [];
    }

    return Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([name, version]) => ({
        manifestPath,
        name,
        version,
        type
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private malformed(path: string): ParsedPackageJson {
    return {
      status: "MALFORMED",
      issue: {
        path,
        code: "MALFORMED_PACKAGE_JSON"
      }
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
