import type { DownloadedAiExport } from "@/features/ai-export/api/ai-export-api";

export function triggerDownload(exported: DownloadedAiExport): void {
  const url = URL.createObjectURL(exported.content);
  const link = document.createElement("a");

  link.href = url;
  link.download = exported.filename;
  link.rel = "noopener";
  link.type = exported.contentType;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
