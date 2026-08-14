import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaScanContentReader } from "./prisma-scan-content.reader.js";

type StoredScannedFile = {
  scanId: string;
  path: string;
  extension: string | null;
  size: bigint;
  sha: string;
  content: string | null;
  isBinary: boolean;
  isHidden: boolean;
  scan: {
    status: string;
  };
};

const storedFiles: StoredScannedFile[] = [
  {
    scanId: "scan_1",
    path: "src/app.ts",
    extension: "ts",
    size: 20n,
    sha: "app_sha",
    content: "export const app = true;",
    isBinary: false,
    isHidden: false,
    scan: { status: "COMPLETED" }
  },
  {
    scanId: "scan_1",
    path: "src/main.ts",
    extension: "ts",
    size: 42n,
    sha: "main_sha_scan_1",
    content: "console.log('scan-1');",
    isBinary: false,
    isHidden: false,
    scan: { status: "COMPLETED" }
  },
  {
    scanId: "scan_1",
    path: ".env",
    extension: null,
    size: 12n,
    sha: "env_sha",
    content: "SECRET=nope",
    isBinary: false,
    isHidden: true,
    scan: { status: "COMPLETED" }
  },
  {
    scanId: "scan_1",
    path: "assets/logo.png",
    extension: "png",
    size: 512n,
    sha: "logo_sha",
    content: null,
    isBinary: true,
    isHidden: false,
    scan: { status: "COMPLETED" }
  },
  {
    scanId: "scan_2",
    path: "src/main.ts",
    extension: "ts",
    size: 50n,
    sha: "main_sha_scan_2",
    content: "console.log('scan-2');",
    isBinary: false,
    isHidden: false,
    scan: { status: "COMPLETED" }
  },
  {
    scanId: "pending_scan",
    path: "src/main.ts",
    extension: "ts",
    size: 10n,
    sha: "pending_sha",
    content: "console.log('pending');",
    isBinary: false,
    isHidden: false,
    scan: { status: "PENDING" }
  }
];

function createReader(files = storedFiles) {
  const scanFile = {
    findMany: vi.fn(async (query: { where: { scanId: string; scan: { status: string } } }) =>
      files
        .filter(
          (file) =>
            file.scanId === query.where.scanId && file.scan.status === query.where.scan.status
        )
        .sort((left, right) => left.path.localeCompare(right.path))
        .map(({ path, extension, size, sha, isBinary, isHidden }) => ({
          path,
          extension,
          size,
          sha,
          isBinary,
          isHidden
        }))
    ),
    findFirst: vi.fn(
      async (query: { where: { scanId: string; path: string; scan: { status: string } } }) => {
        const file =
          files.find(
            (item) =>
              item.scanId === query.where.scanId &&
              item.path === query.where.path &&
              item.scan.status === query.where.scan.status
          ) ?? null;

        return file ? { path: file.path, content: file.content } : null;
      }
    )
  };
  const prisma = {
    scanFile
  } as unknown as PrismaService;

  return {
    scanFile,
    reader: new PrismaScanContentReader(prisma)
  };
}

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];

  for await (const item of items) {
    collected.push(item);
  }

  return collected;
}

describe("PrismaScanContentReader", () => {
  it("lists only files belonging to the requested completed scan", async () => {
    const { reader, scanFile } = createReader();

    await expect(collect(reader.listFiles("scan_1"))).resolves.toEqual([
      {
        path: ".env",
        extension: null,
        size: 12n,
        sha: "env_sha",
        isBinary: false,
        isHidden: true
      },
      {
        path: "assets/logo.png",
        extension: "png",
        size: 512n,
        sha: "logo_sha",
        isBinary: true,
        isHidden: false
      },
      {
        path: "src/app.ts",
        extension: "ts",
        size: 20n,
        sha: "app_sha",
        isBinary: false,
        isHidden: false
      },
      {
        path: "src/main.ts",
        extension: "ts",
        size: 42n,
        sha: "main_sha_scan_1",
        isBinary: false,
        isHidden: false
      }
    ]);
    expect(scanFile.findMany).toHaveBeenCalledWith({
      where: {
        scanId: "scan_1",
        scan: {
          status: "COMPLETED"
        }
      },
      orderBy: { path: "asc" },
      select: {
        path: true,
        extension: true,
        size: true,
        sha: true,
        isBinary: true,
        isHidden: true
      }
    });
  });

  it("behaves as an AsyncIterable", async () => {
    const { reader } = createReader();
    const paths: string[] = [];

    for await (const file of reader.listFiles("scan_1")) {
      paths.push(file.path);
    }

    expect(paths).toEqual([".env", "assets/logo.png", "src/app.ts", "src/main.ts"]);
  });

  it("reads content for the requested scan and path", async () => {
    const { reader } = createReader();

    await expect(reader.readFile("scan_1", "src/main.ts")).resolves.toEqual({
      path: "src/main.ts",
      content: "console.log('scan-1');"
    });
  });

  it("preserves scan isolation for identical paths", async () => {
    const { reader, scanFile } = createReader();

    await expect(reader.readFile("scan_1", "src/main.ts")).resolves.toEqual({
      path: "src/main.ts",
      content: "console.log('scan-1');"
    });
    expect(scanFile.findFirst).toHaveBeenCalledWith({
      where: {
        scanId: "scan_1",
        path: "src/main.ts",
        scan: {
          status: "COMPLETED"
        }
      },
      select: {
        path: true,
        content: true
      }
    });
  });

  it("returns null for a missing file", async () => {
    const { reader } = createReader();

    await expect(reader.readFile("scan_1", "missing.ts")).resolves.toBeNull();
  });

  it("does not expose content for binary files with no stored text content", async () => {
    const { reader } = createReader();

    await expect(reader.readFile("scan_1", "assets/logo.png")).resolves.toBeNull();
  });

  it("does not return files from non-completed scans", async () => {
    const { reader } = createReader();

    await expect(collect(reader.listFiles("pending_scan"))).resolves.toEqual([]);
    await expect(reader.readFile("pending_scan", "src/main.ts")).resolves.toBeNull();
  });
});
