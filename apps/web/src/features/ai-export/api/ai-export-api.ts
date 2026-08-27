import type { AiExportFormat, AiExportResponse } from "@ai-context/contracts";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RequestOptions = {
  accessToken: string;
};

export type GetAiExportInput = {
  contextId: string;
  format: AiExportFormat;
};

export type DownloadedAiExport = {
  content: Blob;
  contentType: string;
  filename: string;
};

export class AiExportApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new AiExportApiRequestError(
      payload?.message ?? "AI export request failed",
      response.status
    );
  }

  return response.json() as Promise<T>;
}

async function requestDownload(path: string, options: RequestOptions): Promise<DownloadedAiExport> {
  const response = await authenticatedFetch(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new AiExportApiRequestError(
      payload?.message ?? "AI export download failed",
      response.status
    );
  }

  const filename = filenameFromContentDisposition(response.headers.get("Content-Disposition"));

  if (!filename) {
    throw new AiExportApiRequestError(
      "AI export download did not include a filename",
      response.status
    );
  }

  return {
    content: await response.blob(),
    contentType: response.headers.get("Content-Type") ?? "application/octet-stream",
    filename
  };
}

export function getAiExport(
  accessToken: string,
  input: GetAiExportInput
): Promise<AiExportResponse> {
  return requestJson<AiExportResponse>(exportPath(input, false), { accessToken });
}

export function downloadAiExport(
  accessToken: string,
  input: GetAiExportInput
): Promise<DownloadedAiExport> {
  return requestDownload(exportPath(input, true), { accessToken });
}

function exportPath(input: GetAiExportInput, download: boolean): string {
  const params = new URLSearchParams({
    format: input.format,
    download: String(download)
  });

  return `/contexts/${encodeURIComponent(input.contextId)}/export?${params.toString()}`;
}

export function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(value);

  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(value);

  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const unquotedMatch = /filename=([^;]+)/i.exec(value);

  return unquotedMatch?.[1]?.trim() ?? null;
}

export type { AiExportFormat, AiExportResponse } from "@ai-context/contracts";
