import type { ScanContentFile } from "../contracts/scan-content-reader.contract.js";
import type { FileCategory } from "./file-category.js";
import type { FileClassification } from "./file-classification.js";
import type { FileClassifier } from "./file-classifier.js";

type ClassificationRule = {
  category: FileCategory;
  matches(context: FileContext): boolean;
};

type FileContext = {
  filename: string;
  extension: string | null;
  segments: readonly string[];
  isBinary: boolean;
};

const SOURCE_EXTENSIONS = new Set([
  "c",
  "cc",
  "cpp",
  "cs",
  "css",
  "go",
  "java",
  "js",
  "jsx",
  "kt",
  "mjs",
  "php",
  "py",
  "rb",
  "rs",
  "scss",
  "swift",
  "ts",
  "tsx",
  "vue"
]);

const ASSET_EXTENSIONS = new Set([
  "avif",
  "eot",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "otf",
  "png",
  "svg",
  "ttf",
  "webm",
  "webp",
  "woff",
  "woff2"
]);

const DOCUMENTATION_FILENAMES = new Set([
  "changelog",
  "changelog.md",
  "code_of_conduct.md",
  "contributing.md",
  "license",
  "license.md",
  "readme",
  "readme.md"
]);

const LOCKFILE_FILENAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "composer.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "yarn.lock"
]);

const CONFIG_FILENAMES = new Set([
  ".babelrc",
  ".dockerignore",
  ".editorconfig",
  ".env.example",
  ".eslintrc",
  ".gitattributes",
  ".gitignore",
  ".npmrc",
  ".prettierrc",
  "biome.json",
  "components.json",
  "nest-cli.json",
  "package.json",
  "tsconfig.json"
]);

const CONFIG_PREFIXES = [
  ".eslintrc.",
  ".prettierrc.",
  "eslint.config.",
  "jest.config.",
  "postcss.config.",
  "prettier.config.",
  "tailwind.config.",
  "tsup.config.",
  "turbo.",
  "vite.config.",
  "vitest.config."
];

const INFRASTRUCTURE_FILENAMES = new Set(["dockerfile"]);
const INFRASTRUCTURE_PREFIXES = ["docker-compose."];
const INFRASTRUCTURE_DIRECTORIES = new Set(["helm", "k8s", "kubernetes", "terraform"]);
const GENERATED_DIRECTORIES = new Set([".next", "build", "coverage", "dist", "generated"]);
const TEST_DIRECTORIES = new Set(["__tests__", "test", "tests"]);
const ASSET_DIRECTORIES = new Set(["assets", "fonts", "icons", "images", "media", "public"]);

const ORDERED_RULES: readonly ClassificationRule[] = [
  {
    category: "GENERATED",
    matches: (file) =>
      containsSegment(file.segments, GENERATED_DIRECTORIES) ||
      file.filename.includes(".generated.") ||
      file.filename.includes(".gen.")
  },
  {
    category: "LOCKFILE",
    matches: (file) => LOCKFILE_FILENAMES.has(file.filename)
  },
  {
    category: "TEST",
    matches: (file) =>
      containsSegment(file.segments, TEST_DIRECTORIES) ||
      file.filename.includes(".test.") ||
      file.filename.includes(".spec.")
  },
  {
    category: "DOCUMENTATION",
    matches: (file) =>
      DOCUMENTATION_FILENAMES.has(file.filename) ||
      file.segments.includes("docs") ||
      file.extension === "md" ||
      file.extension === "mdx"
  },
  {
    category: "INFRASTRUCTURE",
    matches: (file) =>
      INFRASTRUCTURE_FILENAMES.has(file.filename) ||
      INFRASTRUCTURE_PREFIXES.some((prefix) => file.filename.startsWith(prefix)) ||
      containsSegment(file.segments, INFRASTRUCTURE_DIRECTORIES) ||
      file.extension === "tf"
  },
  {
    category: "CONFIG",
    matches: (file) =>
      CONFIG_FILENAMES.has(file.filename) ||
      CONFIG_PREFIXES.some((prefix) => file.filename.startsWith(prefix))
  },
  {
    category: "SCRIPT",
    matches: (file) =>
      file.segments.includes("scripts") || file.extension === "bash" || file.extension === "sh"
  },
  {
    category: "ASSET",
    matches: (file) =>
      file.isBinary ||
      containsSegment(file.segments, ASSET_DIRECTORIES) ||
      (file.extension !== null && ASSET_EXTENSIONS.has(file.extension))
  },
  {
    category: "SOURCE",
    matches: (file) => file.extension !== null && SOURCE_EXTENSIONS.has(file.extension)
  }
];

export class RuleBasedFileClassifier implements FileClassifier {
  classify(file: ScanContentFile): FileClassification {
    const context = this.createContext(file);
    const rule = ORDERED_RULES.find((candidate) => candidate.matches(context));

    return {
      path: file.path,
      category: rule?.category ?? "UNKNOWN"
    };
  }

  private createContext(file: ScanContentFile): FileContext {
    const normalizedPath = file.path.replaceAll("\\", "/").toLowerCase();
    const segments = normalizedPath.split("/").filter(Boolean);
    const filename = segments.at(-1) ?? normalizedPath;

    return {
      filename,
      extension: this.resolveExtension(file, filename),
      segments,
      isBinary: file.isBinary
    };
  }

  private resolveExtension(file: ScanContentFile, filename: string): string | null {
    if (file.extension) {
      return file.extension.toLowerCase();
    }

    const dotIndex = filename.lastIndexOf(".");

    if (dotIndex <= 0 || dotIndex === filename.length - 1) {
      return null;
    }

    return filename.slice(dotIndex + 1).toLowerCase();
  }
}

function containsSegment(segments: readonly string[], candidates: ReadonlySet<string>): boolean {
  return segments.some((segment) => candidates.has(segment));
}
