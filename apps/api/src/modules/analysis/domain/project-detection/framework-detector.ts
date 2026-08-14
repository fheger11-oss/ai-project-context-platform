import type { DetectedFramework, PackageDependency, ProjectFramework } from "./project-profile.js";

const FRAMEWORK_BY_DEPENDENCY_NAME: Readonly<Record<string, ProjectFramework>> = {
  [`@nest${"js"}/core`]: "NESTJS",
  next: "NEXT_JS",
  react: "REACT"
};

const FRAMEWORK_ORDER: readonly ProjectFramework[] = ["NESTJS", "NEXT_JS", "REACT"];

export class FrameworkDetector {
  detect(dependencies: readonly PackageDependency[]): DetectedFramework[] {
    const evidenceByFramework = new Map<ProjectFramework, string[]>();

    for (const dependency of dependencies) {
      const framework = FRAMEWORK_BY_DEPENDENCY_NAME[dependency.name];

      if (!framework) {
        continue;
      }

      const evidence = `${dependency.manifestPath}:${dependency.name}`;
      evidenceByFramework.set(framework, [...(evidenceByFramework.get(framework) ?? []), evidence]);
    }

    return FRAMEWORK_ORDER.flatMap((framework) => {
      const evidence = evidenceByFramework.get(framework);

      return evidence
        ? [
            {
              framework,
              evidence: evidence.sort((left, right) => left.localeCompare(right))
            }
          ]
        : [];
    });
  }
}
