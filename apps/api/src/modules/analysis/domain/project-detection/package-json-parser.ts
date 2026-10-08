import type {
  PackageDependency,
  PackageDependencyType,
  PackageJsonPackage,
  PackagePublicSurfaceDeclaration,
  PackageSurfaceSelector,
  PackageScript,
  ProjectDetectionIssue
} from "./project-profile.js";
import { comparePackagePublicSurfaceDeclarations } from "./project-profile.js";

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
    const scripts = this.parseScripts(input.path, payload.scripts);
    const publicSurfaceDeclarations = this.parsePublicSurfaceDeclarations(input.path, payload);

    return {
      status: "PARSED",
      packageJson: {
        path: input.path,
        isPrimary: input.isPrimary,
        name: typeof payload.name === "string" ? payload.name : null,
        version: typeof payload.version === "string" ? payload.version : null,
        dependencies,
        ...(scripts.length > 0 ? { scripts } : {}),
        publicSurfaceDeclarations
      }
    };
  }

  private parsePublicSurfaceDeclarations(
    manifestPath: string,
    payload: Record<string, unknown>
  ): PackagePublicSurfaceDeclaration[] {
    const declarations: PackagePublicSurfaceDeclaration[] = [];

    for (const [field, sourceField] of [
      ["main", "MAIN"],
      ["module", "MODULE"],
      ["types", "TYPES"]
    ] as const) {
      const target = payload[field];
      if (typeof target === "string") {
        declarations.push({
          manifestPath,
          sourceField,
          subpath: ".",
          selectorPath: [],
          disposition: "TARGET",
          declaredTarget: target
        });
      }
    }

    declarations.push(...this.parseExports(manifestPath, payload.exports));
    return declarations.sort(comparePackagePublicSurfaceDeclarations);
  }

  private parseExports(manifestPath: string, value: unknown): PackagePublicSurfaceDeclaration[] {
    if (this.isRecord(value) && Object.keys(value).every((key) => key.startsWith("."))) {
      return Object.keys(value)
        .sort()
        .flatMap((subpath) => this.parseExportTarget(manifestPath, subpath, value[subpath], []));
    }

    return this.parseExportTarget(manifestPath, ".", value, []);
  }

  private parseExportTarget(
    manifestPath: string,
    subpath: string,
    value: unknown,
    selectorPath: readonly PackageSurfaceSelector[]
  ): PackagePublicSurfaceDeclaration[] {
    if (typeof value === "string") {
      return [
        {
          manifestPath,
          sourceField: "EXPORTS",
          subpath,
          selectorPath,
          disposition: "TARGET",
          declaredTarget: value
        }
      ];
    }
    if (value === null) {
      return [
        {
          manifestPath,
          sourceField: "EXPORTS",
          subpath,
          selectorPath,
          disposition: "BLOCKED",
          declaredTarget: null
        }
      ];
    }
    if (Array.isArray(value)) {
      return value.flatMap((target, index) =>
        this.parseExportTarget(manifestPath, subpath, target, [
          ...selectorPath,
          { kind: "FALLBACK", index }
        ])
      );
    }
    if (this.isRecord(value)) {
      return Object.keys(value)
        .sort()
        .flatMap((condition) =>
          this.parseExportTarget(manifestPath, subpath, value[condition], [
            ...selectorPath,
            { kind: "CONDITION", value: condition }
          ])
        );
    }
    return [];
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

  private parseScripts(manifestPath: string, value: unknown): PackageScript[] {
    if (!this.isRecord(value)) {
      return [];
    }

    return Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([name, command]) => ({
        manifestPath,
        name,
        command
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
