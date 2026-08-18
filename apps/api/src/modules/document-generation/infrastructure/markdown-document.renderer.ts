import type { DocumentRenderer } from "../domain/contracts/document-renderer.contract.js";
import type { DocumentBlock, DocumentModel } from "../domain/document-model.js";

export class MarkdownDocumentRenderer implements DocumentRenderer<DocumentModel> {
  async render(model: DocumentModel): Promise<string> {
    return `${renderDocument(model)}\n`;
  }
}

function renderDocument(model: DocumentModel): string {
  const parts = [`# ${markdownText(model.title)}`];

  for (const section of model.sections) {
    const renderedBlocks = section.blocks.map(renderBlock).filter((block) => block.length > 0);

    if (renderedBlocks.length === 0) {
      continue;
    }

    parts.push(`## ${markdownText(section.heading)}`, renderedBlocks.join("\n\n"));
  }

  return parts.join("\n\n");
}

function renderBlock(block: DocumentBlock): string {
  switch (block.kind) {
    case "paragraph":
      return markdownText(block.text);
    case "unordered-list":
      return block.items.map((item) => `- ${markdownText(item)}`).join("\n");
  }
}

function markdownText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
