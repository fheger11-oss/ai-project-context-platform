const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"] as const;

const SUBSTITUTABLE_EXTENSIONS = new Set<string>(SOURCE_EXTENSIONS);

export type LocalModuleResolution =
  | {
      resolved: true;
      targetPath: string;
    }
  | {
      resolved: false;
      targetPath: null;
    };

export class ModuleSpecifierResolver {
  private readonly sourcePaths: ReadonlySet<string>;

  constructor(sourcePaths: Iterable<string>) {
    this.sourcePaths = new Set(Array.from(sourcePaths, normalizePath));
  }

  resolve(sourcePath: string, specifier: string): LocalModuleResolution {
    if (!isRelativeSpecifier(specifier)) {
      return {
        resolved: false,
        targetPath: null
      };
    }

    const basePath = normalizePath(`${dirname(sourcePath)}/${specifier}`);

    for (const candidate of this.candidates(basePath)) {
      if (this.sourcePaths.has(candidate)) {
        return {
          resolved: true,
          targetPath: candidate
        };
      }
    }

    return {
      resolved: false,
      targetPath: null
    };
  }

  private candidates(basePath: string): string[] {
    const extension = extensionOf(basePath);

    if (extension) {
      const withoutExtension = basePath.slice(0, -extension.length);
      const substitutionCandidates = SUBSTITUTABLE_EXTENSIONS.has(extension)
        ? SOURCE_EXTENSIONS.map((candidateExtension) => `${withoutExtension}${candidateExtension}`)
        : [];

      return unique([basePath, ...substitutionCandidates]);
    }

    return unique([
      ...SOURCE_EXTENSIONS.map((extensionCandidate) => `${basePath}${extensionCandidate}`),
      ...SOURCE_EXTENSIONS.map((extensionCandidate) => `${basePath}/index${extensionCandidate}`)
    ]);
  }
}

export function isRelativeSpecifier(specifier: string): boolean {
  return (
    specifier === "." ||
    specifier === ".." ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  );
}

export function packageNameFromSpecifier(specifier: string): string {
  const normalized = specifier.replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);

  if (normalized.startsWith("@") && segments.length >= 2) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0] ?? specifier;
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");

  return index === -1 ? "." : normalized.slice(0, index);
}

function normalizePath(path: string): string {
  const segments: string[] = [];

  for (const segment of path.replaceAll("\\", "/").split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return segments.join("/");
}

function extensionOf(path: string): string | null {
  const filename = path.split("/").at(-1) ?? path;
  const index = filename.lastIndexOf(".");

  if (index <= 0 || index === filename.length - 1) {
    return null;
  }

  return filename.slice(index).toLowerCase();
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}
