import type { ScanContentFile } from "../contracts/scan-content-reader.contract.js";
import type { FileClassification } from "./file-classification.js";

export interface FileClassifier {
  classify(file: ScanContentFile): FileClassification;
}
