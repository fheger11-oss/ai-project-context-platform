import type {
  DetectedLanguage,
  PackageJsonPackage,
  ProjectEcosystem,
  ProjectManifest
} from "./project-profile.js";

const ECOSYSTEM_ORDER: readonly ProjectEcosystem[] = ["NODE_JS", "TYPESCRIPT", "JAVASCRIPT"];

export class EcosystemDetector {
  detect(input: {
    languages: readonly DetectedLanguage[];
    manifests: readonly ProjectManifest[];
    packages: readonly PackageJsonPackage[];
  }): ProjectEcosystem[] {
    const ecosystems = new Set<ProjectEcosystem>();

    if (
      input.packages.length > 0 ||
      input.manifests.some((manifest) =>
        ["PACKAGE_JSON", "PACKAGE_LOCK", "PNPM_LOCK", "YARN_LOCK"].includes(manifest.type)
      )
    ) {
      ecosystems.add("NODE_JS");
    }

    if (
      input.languages.some((language) => language.language === "TYPESCRIPT") ||
      input.manifests.some((manifest) => manifest.type === "TSCONFIG") ||
      input.packages.some((packageJson) =>
        packageJson.dependencies.some((dependency) => dependency.name === "typescript")
      )
    ) {
      ecosystems.add("TYPESCRIPT");
    }

    if (input.languages.some((language) => language.language === "JAVASCRIPT")) {
      ecosystems.add("JAVASCRIPT");
    }

    return ECOSYSTEM_ORDER.filter((ecosystem) => ecosystems.has(ecosystem));
  }
}
