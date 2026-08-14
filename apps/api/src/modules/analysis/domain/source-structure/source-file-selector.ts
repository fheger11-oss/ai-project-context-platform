import type { ScanContentFile } from "../contracts/scan-content-reader.contract.js";
import type { FileClassification } from "../classification/file-classification.js";
import type { SourceLanguage } from "./source-file-structure.js";

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, SourceLanguage>> = {
  cjs: "JAVASCRIPT",
  cts: "TYPESCRIPT",
  js: "JAVASCRIPT",
  jsx: "JAVASCRIPT_JSX",
  mjs: "JAVASCRIPT",
  mts: "TYPESCRIPT",
  ts: "TYPESCRIPT",
  tsx: "TYPESCRIPT_TSX"
};

export function detectSourceLanguage(file: ScanContentFile): SourceLanguage | null {
  const extension = resolveExtension(file);

  return extension ? (LANGUAGE_BY_EXTENSION[extension] ?? null) : null;
}

export function shouldAnalyzeSourceStructure(
  file: ScanContentFile,
  classification: FileClassification
): boolean {
  if (classification.category !== "SOURCE" && classification.category !== "TEST") {
    return false;
  }

  return detectSourceLanguage(file) !== null;
}

function resolveExtension(file: ScanContentFile): string | null {
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
