import { assertSupportedDocumentFormat } from "./document-format.js";
import { assertSupportedDocumentType } from "./document-type.js";
import { InvalidGeneratedDocumentError } from "./errors/invalid-generated-document.error.js";
import type { GeneratedDocument } from "./generated-document.js";

export type DocumentSnapshot = GeneratedDocument;

export type CreateDocumentInput = GeneratedDocument;

export class Document {
  private constructor(private readonly snapshot: DocumentSnapshot) {}

  static create(input: CreateDocumentInput): Document {
    assertSupportedDocumentType(input.documentType);
    assertSupportedDocumentFormat(input.format);
    assertRequiredDocumentField("contextId", input.contextId);
    assertRequiredDocumentField("generatorVersion", input.generatorVersion);

    return new Document({ ...input });
  }

  static fromSnapshot(snapshot: DocumentSnapshot): Document {
    return Document.create(snapshot);
  }

  get contextId(): string {
    return this.snapshot.contextId;
  }

  get documentType(): GeneratedDocument["documentType"] {
    return this.snapshot.documentType;
  }

  get format(): GeneratedDocument["format"] {
    return this.snapshot.format;
  }

  get generatorVersion(): string {
    return this.snapshot.generatorVersion;
  }

  get content(): string {
    return this.snapshot.content;
  }

  toSnapshot(): DocumentSnapshot {
    return { ...this.snapshot };
  }
}

function assertRequiredDocumentField(field: "contextId" | "generatorVersion", value: string): void {
  if (value.trim().length === 0) {
    throw new InvalidGeneratedDocumentError(field);
  }
}
