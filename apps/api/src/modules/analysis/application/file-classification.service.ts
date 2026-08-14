import { Injectable } from "@nestjs/common";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type { FileClassification } from "../domain/classification/file-classification.js";
import { RuleBasedFileClassifier } from "../domain/classification/rule-based-file-classifier.js";

@Injectable()
export class FileClassificationService {
  private readonly fileClassifier = new RuleBasedFileClassifier();

  async classifyFiles(input: AnalysisInput): Promise<FileClassification[]> {
    const classifications: FileClassification[] = [];

    for await (const file of input.contentReader.listFiles(input.scanId)) {
      classifications.push(this.fileClassifier.classify(file));
    }

    return classifications;
  }
}
