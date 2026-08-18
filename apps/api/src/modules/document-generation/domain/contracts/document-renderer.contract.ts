export const DOCUMENT_RENDERER = Symbol("DOCUMENT_RENDERER");

export interface DocumentRenderer<TDocumentModel = unknown> {
  render(model: TDocumentModel): Promise<string>;
}
