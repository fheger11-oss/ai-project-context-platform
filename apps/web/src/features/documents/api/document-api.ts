import type {
  DocumentHistoryResponse,
  GeneratedDocumentResponse,
  GenerateDocumentRequest
} from "@ai-context/contracts";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RequestOptions = {
  accessToken: string;
  body?: unknown;
  method?: "GET" | "POST";
};

export class DocumentApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json"
    }
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  const response = await authenticatedFetch(path, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new DocumentApiRequestError(
      payload?.message ?? "Document request failed",
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export function generateDocument(
  accessToken: string,
  input: GenerateDocumentRequest
): Promise<GeneratedDocumentResponse> {
  return request<GeneratedDocumentResponse>("/documents", {
    accessToken,
    body: input,
    method: "POST"
  });
}

export function createGenerateDocumentRequest(
  contextId: string,
  documentType: GenerateDocumentRequest["documentType"]
): GenerateDocumentRequest {
  return {
    contextId,
    documentType,
    format: "MARKDOWN"
  };
}

export function getDocument(
  accessToken: string,
  documentId: string
): Promise<GeneratedDocumentResponse> {
  return request<GeneratedDocumentResponse>(`/documents/${encodeURIComponent(documentId)}`, {
    accessToken
  });
}

export function getDocumentHistory(
  accessToken: string,
  contextId: string
): Promise<DocumentHistoryResponse> {
  return request<DocumentHistoryResponse>(`/documents?contextId=${encodeURIComponent(contextId)}`, {
    accessToken
  });
}

export function regenerateDocument(
  accessToken: string,
  documentId: string
): Promise<GeneratedDocumentResponse> {
  return request<GeneratedDocumentResponse>(
    `/documents/${encodeURIComponent(documentId)}/regenerate`,
    {
      accessToken,
      method: "POST"
    }
  );
}

export type {
  DocumentHistoryResponse,
  GeneratedDocumentResponse,
  GenerateDocumentRequest
} from "@ai-context/contracts";
