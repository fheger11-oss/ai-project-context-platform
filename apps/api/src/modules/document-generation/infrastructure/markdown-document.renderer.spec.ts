import { describe, expect, it } from "vitest";

import type { DocumentModel } from "../domain/document-model.js";
import { MarkdownDocumentRenderer } from "./markdown-document.renderer.js";

describe("MarkdownDocumentRenderer", () => {
  it("renders stable Markdown headings, lists, blank lines, and a trailing newline", async () => {
    const model: DocumentModel = {
      title: "Project Overview",
      sections: [
        {
          heading: "Technology",
          blocks: [
            {
              kind: "unordered-list",
              items: ["Observed: NestJS.", "Likely inferred: React."]
            }
          ]
        },
        {
          heading: "Notes",
          blocks: [
            {
              kind: "paragraph",
              text: "Whitespace     is normalized."
            }
          ]
        }
      ]
    };

    await expect(new MarkdownDocumentRenderer().render(model)).resolves.toBe(
      [
        "# Project Overview",
        "",
        "## Technology",
        "",
        "- Observed: NestJS.",
        "- Likely inferred: React.",
        "",
        "## Notes",
        "",
        "Whitespace is normalized.",
        ""
      ].join("\n")
    );
  });

  it("omits empty sections while keeping valid Markdown", async () => {
    const model: DocumentModel = {
      title: "Project Overview",
      sections: [
        {
          heading: "Empty",
          blocks: []
        }
      ]
    };

    await expect(new MarkdownDocumentRenderer().render(model)).resolves.toBe(
      "# Project Overview\n"
    );
  });
});
