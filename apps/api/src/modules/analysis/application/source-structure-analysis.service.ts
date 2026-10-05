import { Inject, Injectable } from "@nestjs/common";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import { SOURCE_PARSER, type SourceParser } from "../domain/contracts/source-parser.contract.js";
import { RuleBasedFileClassifier } from "../domain/classification/rule-based-file-classifier.js";
import type { SourceFileStructure } from "../domain/source-structure/source-file-structure.js";
import {
  detectSourceLanguage,
  shouldAnalyzeSourceStructure
} from "../domain/source-structure/source-file-selector.js";

export enum SourceStructureProcessingDisposition {
  REUSED = "REUSED",
  PARSED = "PARSED",
  EXCLUDED = "EXCLUDED"
}

export type SourceStructureProcessingObserver = (event: {
  path: string;
  disposition: SourceStructureProcessingDisposition;
}) => void;

@Injectable()
export class SourceStructureAnalysisService {
  private readonly fileClassifier = new RuleBasedFileClassifier();

  constructor(
    @Inject(SOURCE_PARSER)
    private readonly sourceParser: SourceParser
  ) {}

  async analyzeSourceStructure(
    input: AnalysisInput,
    reusableStructures?: ReadonlyMap<string, SourceFileStructure>,
    observer?: SourceStructureProcessingObserver
  ): Promise<SourceFileStructure[]> {
    const structures: SourceFileStructure[] = [];

    for await (const file of input.contentReader.listFiles(input.scanId)) {
      const classification = this.fileClassifier.classify(file);

      if (!shouldAnalyzeSourceStructure(file, classification)) {
        observer?.({ path: file.path, disposition: SourceStructureProcessingDisposition.EXCLUDED });
        continue;
      }

      const reused = reusableStructures?.get(file.path);
      if (reused) {
        structures.push(reused);
        observer?.({ path: file.path, disposition: SourceStructureProcessingDisposition.REUSED });
        continue;
      }

      const language = detectSourceLanguage(file);
      const content = await input.contentReader.readFile(input.scanId, file.path);

      if (!language || !content) {
        observer?.({ path: file.path, disposition: SourceStructureProcessingDisposition.EXCLUDED });
        continue;
      }

      const structure = this.sourceParser.parse({
        path: file.path,
        language,
        content: content.content
      });
      structures.push(structure);
      observer?.({ path: file.path, disposition: SourceStructureProcessingDisposition.PARSED });
    }

    return structures;
  }
}
