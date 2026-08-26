import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./plain-text-ai-export.serializer.ts", import.meta.url),
  "utf8"
);

describe("PlainTextAiExportSerializer boundaries", () => {
  it("does not depend on ProjectContext, upstream engines, or sibling serializers", () => {
    expect(source).not.toMatch(/ProjectContext/);
    expect(source).not.toMatch(/from\s+["'][^"']*\/context\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/scan\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/analysis\//);
    expect(source).not.toMatch(/from\s+["'][^"']*\/document-generation\//);
    expect(source).not.toMatch(/MarkdownAiExportSerializer|markdown-ai-export/);
    expect(source).not.toMatch(/AiContextSerializer|ai-context\.serializer|AI_CONTEXT/);
  });

  it("does not depend on persistence, HTTP, frontend, filesystem, or providers", () => {
    expect(source).not.toMatch(/github/i);
    expect(source).not.toMatch(/@prisma\//i);
    expect(source).not.toMatch(/generated\/prisma/i);
    expect(source).not.toMatch(/@nestjs\//);
    expect(source).not.toMatch(/\bexpress\b|\bfastify\b|\bhttp\b/i);
    expect(source).not.toMatch(/apps\/web|browser|window|document\./i);
    expect(source).not.toMatch(/node:fs|node:path|readFile|writeFile/);
    expect(source).not.toMatch(/openai|anthropic|claude|chatgpt|cursor|copilot|gemini/i);
  });
});
