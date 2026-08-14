import { Injectable } from "@nestjs/common";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type { ScanContentFile } from "../domain/contracts/scan-content-reader.contract.js";
import {
  EcosystemDetector,
  ExtensionLanguageDetector,
  FrameworkDetector,
  ManifestDetector,
  PackageJsonParser,
  PackageManagerDetector
} from "../domain/project-detection/project-detectors.js";
import type {
  PackageJsonPackage,
  ProjectDetectionIssue,
  ProjectManifest,
  ProjectProfile
} from "../domain/project-detection/project-profile.js";

@Injectable()
export class ProjectDetectionService {
  constructor(
    private readonly manifestDetector = new ManifestDetector(),
    private readonly languageDetector = new ExtensionLanguageDetector(),
    private readonly packageManagerDetector = new PackageManagerDetector(),
    private readonly packageJsonParser = new PackageJsonParser(),
    private readonly frameworkDetector = new FrameworkDetector(),
    private readonly ecosystemDetector = new EcosystemDetector()
  ) {}

  async detectProject(input: AnalysisInput): Promise<ProjectProfile> {
    const files = await this.listFiles(input);
    const manifests = this.manifestDetector.detect(files);
    const languages = this.languageDetector.detect(files);
    const packageJsonResult = await this.parsePackageJsonManifests(input, manifests);
    const dependencies = packageJsonResult.packages.flatMap((packageJson) => [
      ...packageJson.dependencies
    ]);
    const frameworks = this.frameworkDetector.detect(dependencies);
    const ecosystems = this.ecosystemDetector.detect({
      languages,
      manifests,
      packages: packageJsonResult.packages
    });

    return {
      ecosystems,
      languages,
      packageManager: this.packageManagerDetector.detect(manifests),
      frameworks,
      manifests,
      packages: packageJsonResult.packages,
      dependencies,
      issues: packageJsonResult.issues
    };
  }

  private async listFiles(input: AnalysisInput): Promise<ScanContentFile[]> {
    const files: ScanContentFile[] = [];

    for await (const file of input.contentReader.listFiles(input.scanId)) {
      files.push(file);
    }

    return files;
  }

  private async parsePackageJsonManifests(
    input: AnalysisInput,
    manifests: readonly ProjectManifest[]
  ): Promise<{
    packages: PackageJsonPackage[];
    issues: ProjectDetectionIssue[];
  }> {
    const packages: PackageJsonPackage[] = [];
    const issues: ProjectDetectionIssue[] = [];

    for (const manifest of manifests) {
      if (manifest.type !== "PACKAGE_JSON") {
        continue;
      }

      const content = await input.contentReader.readFile(input.scanId, manifest.path);

      if (!content) {
        issues.push({
          path: manifest.path,
          code: "MISSING_MANIFEST_CONTENT"
        });
        continue;
      }

      const parsed = this.packageJsonParser.parse({
        path: manifest.path,
        content: content.content,
        isPrimary: manifest.isPrimary
      });

      if (parsed.status === "MALFORMED") {
        issues.push(parsed.issue);
        continue;
      }

      packages.push(parsed.packageJson);
    }

    return {
      packages,
      issues
    };
  }
}
