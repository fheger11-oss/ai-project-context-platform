import type { ScanContentFile } from "../contracts/scan-content-reader.contract.js";
import type { DetectedLanguage, ProjectLanguage } from "./project-profile.js";

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, ProjectLanguage>> = {
  cjs: "JAVASCRIPT",
  css: "CSS",
  html: "HTML",
  js: "JAVASCRIPT",
  json: "JSON",
  jsx: "JAVASCRIPT",
  md: "MARKDOWN",
  mdx: "MARKDOWN",
  mjs: "JAVASCRIPT",
  ts: "TYPESCRIPT",
  tsx: "TYPESCRIPT"
};

const LANGUAGE_ORDER: readonly ProjectLanguage[] = [
  "TYPESCRIPT",
  "JAVASCRIPT",
  "JSON",
  "CSS",
  "HTML",
  "MARKDOWN"
];

export class ExtensionLanguageDetector {
  detect(files: readonly ScanContentFile[]): DetectedLanguage[] {
    const counts = new Map<ProjectLanguage, number>();

    for (const file of files) {
      const language = this.detectFileLanguage(file);

      if (language) {
        counts.set(language, (counts.get(language) ?? 0) + 1);
      }
    }

    return LANGUAGE_ORDER.flatMap((language) => {
      const fileCount = counts.get(language);

      return fileCount ? [{ language, fileCount }] : [];
    });
  }

  private detectFileLanguage(file: ScanContentFile): ProjectLanguage | null {
    const extension = this.resolveExtension(file);

    return extension ? (LANGUAGE_BY_EXTENSION[extension] ?? null) : null;
  }

  private resolveExtension(file: ScanContentFile): string | null {
    if (file.extension) {
      return file.extension.toLowerCase();
    }

    const filename = file.path.replaceAll("\\", "/").split("/").at(-1) ?? file.path;
    const dotIndex = filename.lastIndexOf(".");

    if (dotIndex <= 0 || dotIndex === filename.length - 1) {
      return null;
    }

    return filename.slice(dotIndex + 1).toLowerCase();
  }
}
