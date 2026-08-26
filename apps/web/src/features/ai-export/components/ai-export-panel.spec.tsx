import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiExportResponse } from "@ai-context/contracts";

import { downloadAiExport, getAiExport } from "@/features/ai-export/api/ai-export-api";
import { triggerDownload } from "@/features/ai-export/utils/download-ai-export";
import { AiExportPanel } from "./ai-export-panel";

type MutationOptions = {
  mutationFn: () => Promise<unknown>;
  onSuccess?: (result: unknown) => void;
  onError?: (error: unknown) => void;
};

let mutationOptions: MutationOptions[] = [];
let mutationStates: Array<{
  error?: unknown;
  isError: boolean;
  isPending: boolean;
}> = [];
const mutate = vi.fn();
const append = vi.fn();

const exported: AiExportResponse = {
  projectContextId: "project_context_1",
  contextId: "context_1",
  format: "AI_CONTEXT",
  exportVersion: "ai-export@1",
  contextVersion: "context-engine@5.7.1",
  contentType: "application/json; charset=utf-8",
  filename: "ai-context.json",
  content: '{\n  "exact": true\n}\n'
};

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: MutationOptions) => {
    const index = mutationOptions.length;
    mutationOptions.push(options);

    return {
      isError: false,
      isPending: false,
      mutate,
      ...(mutationStates[index] ?? {})
    };
  }
}));

vi.mock("@/features/ai-export/api/ai-export-api", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    getAiExport: vi.fn(),
    downloadAiExport: vi.fn()
  };
});

describe("AiExportPanel", () => {
  beforeEach(() => {
    mutationOptions = [];
    mutationStates = [];
    mutate.mockReset();
    append.mockReset();
    vi.mocked(getAiExport).mockReset();
    vi.mocked(downloadAiExport).mockReset();
    vi.restoreAllMocks();
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(async () => undefined)
      }
    });
    vi.stubGlobal("document", {
      body: {
        append
      },
      createElement: vi.fn()
    });
  });

  it("renders accessible format selection and copy/download actions", () => {
    const markup = renderToStaticMarkup(
      <AiExportPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("AI Export");
    expect(markup).toContain("AI Context");
    expect(markup).toContain("Markdown");
    expect(markup).toContain("Plain Text");
    expect(markup).toContain("Preview export");
    expect(markup).toContain("Copy export");
    expect(markup).toContain("Download export");
    expect(markup).toContain('aria-label="AI export format"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Selected Project Context");
  });

  it("previews exact backend-generated content for the selected format", async () => {
    vi.mocked(getAiExport).mockResolvedValue(exported);
    renderToStaticMarkup(
      <AiExportPanel accessToken="access_token" contextId="project_context_1" />
    );

    await expect(mutationOptions[0]?.mutationFn()).resolves.toBe(exported);
    mutationOptions[0]?.onSuccess?.(exported);

    expect(getAiExport).toHaveBeenCalledWith("access_token", {
      contextId: "project_context_1",
      format: "AI_CONTEXT"
    });
  });

  it("copies exact backend-generated content for the selected format", async () => {
    vi.mocked(getAiExport).mockResolvedValue(exported);
    renderToStaticMarkup(
      <AiExportPanel accessToken="access_token" contextId="project_context_1" />
    );

    await expect(mutationOptions[1]?.mutationFn()).resolves.toBe(exported);

    expect(getAiExport).toHaveBeenCalledWith("access_token", {
      contextId: "project_context_1",
      format: "AI_CONTEXT"
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{\n  "exact": true\n}\n');
  });

  it("downloads backend-generated content and uses backend filename/content type", async () => {
    const file = {
      content: new Blob(["AI PROJECT CONTEXT\n"], { type: "text/plain; charset=utf-8" }),
      contentType: "text/plain; charset=utf-8",
      filename: "ai-context.txt"
    };
    vi.mocked(downloadAiExport).mockResolvedValue(file);
    renderToStaticMarkup(
      <AiExportPanel accessToken="access_token" contextId="project_context_1" />
    );
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = {
      click,
      remove,
      set download(value: string) {
        expect(value).toBe("ai-context.txt");
      },
      set href(value: string) {
        expect(value).toBe("blob:ai-export");
      },
      set rel(value: string) {
        expect(value).toBe("noopener");
      },
      set type(value: string) {
        expect(value).toBe("text/plain; charset=utf-8");
      }
    };
    vi.mocked(document.createElement).mockReturnValue(anchor as unknown as HTMLAnchorElement);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:ai-export"),
      revokeObjectURL: vi.fn()
    });

    await expect(mutationOptions[2]?.mutationFn()).resolves.toBe(file);

    expect(downloadAiExport).toHaveBeenCalledWith("access_token", {
      contextId: "project_context_1",
      format: "AI_CONTEXT"
    });
    expect(append).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:ai-export");
  });

  it("disables duplicate actions while an export request is pending", () => {
    mutationStates = [{ isError: false, isPending: true }];

    const markup = renderToStaticMarkup(
      <AiExportPanel accessToken="access_token" contextId="project_context_1" />
    );

    expect(markup).toContain("Generating");
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-busy="true"');
  });

  it("handles clipboard and download failures with user-facing messages", () => {
    renderToStaticMarkup(
      <AiExportPanel accessToken="access_token" contextId="project_context_1" />
    );

    mutationOptions[1]?.onError?.(new DOMException("Denied"));
    mutationOptions[2]?.onError?.(new Error("Network failed"));

    expect(mutationOptions).toHaveLength(3);
  });

  it("triggers a browser download without inventing filenames", () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = {
      click,
      remove,
      set download(value: string) {
        expect(value).toBe("backend-name.txt");
      },
      set href(value: string) {
        expect(value).toBe("blob:ai-export");
      },
      set rel(value: string) {
        expect(value).toBe("noopener");
      },
      set type(value: string) {
        expect(value).toBe("text/plain; charset=utf-8");
      }
    };
    vi.mocked(document.createElement).mockReturnValue(anchor as unknown as HTMLAnchorElement);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:ai-export"),
      revokeObjectURL: vi.fn()
    });

    triggerDownload({
      content: new Blob(["content"]),
      contentType: "text/plain; charset=utf-8",
      filename: "backend-name.txt"
    });

    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(anchor);
  });
});
