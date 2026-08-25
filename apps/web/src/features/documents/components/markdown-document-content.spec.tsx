import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownDocumentContent } from "./markdown-document-content";

describe("MarkdownDocumentContent", () => {
  it("renders generated Markdown as readable document HTML", () => {
    const markup = renderToStaticMarkup(
      <MarkdownDocumentContent
        content={[
          "# README",
          "",
          "A **strong** *summary* with [docs](https://example.com/docs).",
          "",
          "## Available Scripts",
          "",
          "- `build`",
          "- `test`",
          "",
          "| Command | Value |",
          "| --- | --- |",
          "| `build` | `vite build` |",
          "",
          "```bash",
          "pnpm build",
          "```",
          "",
          "---"
        ].join("\n")}
      />
    );

    expect(markup).toContain("<h1");
    expect(markup).toContain("README");
    expect(markup).toContain("<h2");
    expect(markup).toContain("Available Scripts");
    expect(markup).toContain("<ul");
    expect(markup).toContain("<table");
    expect(markup).toContain("<pre");
    expect(markup).toContain("<code");
    expect(markup).toContain("<strong");
    expect(markup).toContain("<em");
    expect(markup).toContain('href="https://example.com/docs"');
    expect(markup).toContain("<hr");
  });

  it("preserves escaped table pipes inside generated Markdown cells", () => {
    const markup = renderToStaticMarkup(
      <MarkdownDocumentContent
        content={[
          "# Technical Documentation",
          "",
          "| Package | Command |",
          "| --- | --- |",
          "| `scope\\|package` | `echo alpha \\| beta` |"
        ].join("\n")}
      />
    );

    expect(markup).toContain("scope|package");
    expect(markup).toContain("echo alpha | beta");
    expect(markup).not.toContain("<td><code>scope\\</code></td>");
  });
});
