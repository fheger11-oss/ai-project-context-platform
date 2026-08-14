import type { ScanContentFile } from "../contracts/scan-content-reader.contract.js";
import type { ManifestType, ProjectManifest } from "./project-profile.js";

const MANIFEST_FILENAMES: Readonly<Record<string, ManifestType>> = {
  "package.json": "PACKAGE_JSON",
  "package-lock.json": "PACKAGE_LOCK",
  "pnpm-lock.yaml": "PNPM_LOCK",
  "tsconfig.json": "TSCONFIG",
  "yarn.lock": "YARN_LOCK"
};

export class ManifestDetector {
  detect(files: readonly ScanContentFile[]): ProjectManifest[] {
    const manifests = files
      .map((file) => this.detectManifest(file.path))
      .filter((manifest): manifest is ProjectManifest => manifest !== null)
      .sort(compareManifest);
    const hasRootPackageJson = manifests.some(
      (manifest) => manifest.path === "package.json" && manifest.type === "PACKAGE_JSON"
    );

    return manifests.map((manifest) => ({
      ...manifest,
      isPrimary:
        manifest.type === "PACKAGE_JSON" &&
        (manifest.path === "package.json" || (!hasRootPackageJson && manifest.isPrimary))
    }));
  }

  private detectManifest(path: string): ProjectManifest | null {
    const normalizedPath = path.replaceAll("\\", "/").toLowerCase();
    const filename = normalizedPath.split("/").at(-1) ?? normalizedPath;
    const type = MANIFEST_FILENAMES[filename];

    if (!type) {
      return null;
    }

    return {
      path,
      type,
      isPrimary: normalizedPath === filename
    };
  }
}

function compareManifest(left: ProjectManifest, right: ProjectManifest): number {
  if (left.isPrimary !== right.isPrimary) {
    return left.isPrimary ? -1 : 1;
  }

  return left.path.localeCompare(right.path);
}
