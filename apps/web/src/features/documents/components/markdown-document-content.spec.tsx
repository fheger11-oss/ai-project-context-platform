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
          "> Generated from Project Context.",
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
    expect(markup).toContain("<blockquote");
    expect(markup).toContain("Generated from Project Context.");
    expect(markup).toContain('href="https://example.com/docs"');
    expect(markup).toContain("<hr");
  });

  it("exposes only intentional scroll containers as named keyboard-focusable regions", () => {
    const markup = renderToStaticMarkup(
      <MarkdownDocumentContent
        content={[
          "A regular paragraph.",
          "",
          "| Command | Value |",
          "| --- | --- |",
          "| `build` | `vite build` |",
          "",
          "```bash",
          "pnpm build",
          "```"
        ].join("\n")}
      />
    );

    expect(markup).toContain('role="document"');
    expect(markup).toContain('aria-label="Generated document content"');
    expect(markup).toContain('aria-label="Generated document table"');
    expect(markup).toContain('aria-label="Generated document code block"');
    expect(markup.match(/tabindex="0"/g)).toHaveLength(3);
    expect(markup.match(/role="region"/g)).toHaveLength(2);
    expect(markup).toContain("A regular paragraph.");
    expect(markup).toContain("pnpm build");
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

  it("keeps repository-controlled HTML and SVG payloads inert", () => {
    const markup = renderToStaticMarkup(
      <MarkdownDocumentContent
        content={[
          "<script>alert('xss')</script>",
          "<img src=x onerror=alert('xss')>",
          "<svg onload=alert('xss')>",
          "```html",
          "<img src=x onerror=alert('xss')>",
          "```"
        ].join("\n\n")}
      />
    );

    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("<svg");
    expect(markup).toContain("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
    expect(markup).toContain("&lt;img src=x onerror=alert(&#x27;xss&#x27;)&gt;");
    expect(markup).toContain("&lt;svg onload=alert(&#x27;xss&#x27;)&gt;");
  });

  it.each([
    "javascript:alert('xss')",
    "JaVaScRiPt:alert('xss')",
    "data:text/html,<script>alert('xss')</script>",
    "//attacker.example/phishing",
    "/\\\\attacker.example/phishing",
    " https://attacker.example/phishing"
  ])("does not create a navigable link for unsafe repository-controlled URL %s", (url) => {
    const markup = renderToStaticMarkup(
      <MarkdownDocumentContent content={`[repository link](${url})`} />
    );

    expect(markup).toContain("repository link");
    expect(markup).not.toContain("href=");
    expect(markup).not.toContain("target=");
  });

  it("allows HTTP(S), mail, fragments, and root-relative application links", () => {
    const markup = renderToStaticMarkup(
      <MarkdownDocumentContent
        content={[
          "[HTTPS](HTTPS://example.com/docs)",
          "[mail](mailto:security@example.com)",
          "[section](#section)",
          "[local](/repositories/repository_1)"
        ].join(" ")}
      />
    );

    expect(markup).toContain('href="HTTPS://example.com/docs"');
    expect(markup).toContain('href="mailto:security@example.com"');
    expect(markup).toContain('href="#section"');
    expect(markup).toContain('href="/repositories/repository_1"');
    expect(markup.match(/target="_blank"/g)).toHaveLength(1);
  });
});
