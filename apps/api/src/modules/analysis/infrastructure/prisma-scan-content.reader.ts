import { Inject, Injectable } from "@nestjs/common";

import type {
  ScanContentFile,
  ScanContentReader,
  ScannedFileContent
} from "../domain/contracts/scan-content-reader.contract.js";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class PrismaScanContentReader implements ScanContentReader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async *listFiles(scanId: string): AsyncIterable<ScanContentFile> {
    const files = await this.prisma.scanFile.findMany({
      where: {
        scanId,
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

    for (const file of files) {
      yield {
        path: file.path,
        extension: file.extension,
        size: file.size,
        sha: file.sha,
        isBinary: file.isBinary,
        isHidden: file.isHidden
      };
    }
  }

  async readFile(scanId: string, path: string): Promise<ScannedFileContent | null> {
    const file = await this.prisma.scanFile.findFirst({
      where: {
        scanId,
        path,
        scan: {
          status: "COMPLETED"
        }
      },
      select: {
        path: true,
        content: true
      }
    });

    if (!file || file.content === null) {
      return null;
    }

    return {
      path: file.path,
      content: file.content
    };
  }
}
