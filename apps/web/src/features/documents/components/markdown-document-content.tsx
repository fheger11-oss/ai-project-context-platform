import type { ReactNode } from "react";

type MarkdownDocumentContentProps = {
  content: string;
};

type MarkdownBlock =
  | { id: number; type: "code"; value: string }
  | { id: number; type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; value: string }
  | { id: number; type: "hr" }
  | { id: number; type: "list"; ordered: boolean; items: string[] }
  | { id: number; type: "paragraph"; value: string }
  | { id: number; type: "table"; headers: string[]; rows: string[][] };

export function MarkdownDocumentContent({ content }: MarkdownDocumentContentProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="max-h-[42rem] overflow-auto rounded-md border bg-background px-5 py-6">
      <div className="mx-auto grid max-w-3xl gap-5 text-sm leading-7 text-foreground">
        {blocks.map((block) => (
          <MarkdownBlockView block={block} key={block.id} />
        ))}
      </div>
    </div>
  );
}

function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  if (block.type === "heading") {
    const content = renderInlineMarkdown(block.value);

    if (block.level === 1) {
      return <h1 className="text-2xl font-semibold tracking-normal">{content}</h1>;
    }

    if (block.level === 2) {
      return <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">{content}</h2>;
    }

    if (block.level === 3) {
      return <h3 className="text-base font-semibold tracking-normal">{content}</h3>;
    }

    return <h4 className="text-sm font-semibold tracking-normal">{content}</h4>;
  }

  if (block.type === "paragraph") {
    return <p className="text-muted-foreground">{renderInlineMarkdown(block.value)}</p>;
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";

    return (
      <ListTag
        className={
          block.ordered
            ? "grid list-decimal gap-1 pl-5 text-muted-foreground"
            : "grid list-disc gap-1 pl-5 text-muted-foreground"
        }
      >
        {block.items.map((item, index) => (
          <li key={`${block.id}-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "table") {
    return (
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              {block.headers.map((header, index) => (
                <th className="border-b px-3 py-2 font-medium" key={`${block.id}-h-${index}`}>
                  {renderInlineMarkdown(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr className="border-b last:border-b-0" key={`${block.id}-r-${rowIndex}`}>
                {block.headers.map((_, cellIndex) => (
                  <td
                    className="px-3 py-2 align-top"
                    key={`${block.id}-c-${rowIndex}-${cellIndex}`}
                  >
                    {renderInlineMarkdown(row[cellIndex] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs leading-6">
        <code>{block.value}</code>
      </pre>
    );
  }

  return <hr className="border-border" />;
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replaceAll("\r\n", "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  let id = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      blocks.push({ id: id++, type: "code", value: codeLines.join("\n") });
      index += index < lines.length ? 1 : 0;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch?.[1] && headingMatch[2]) {
      blocks.push({
        id: id++,
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        type: "heading",
        value: headingMatch[2].trim()
      });
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ id: id++, type: "hr" });
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = parseTableRow(line);
      index += 2;
      const rows: string[][] = [];

      while (index < lines.length && isTableRow(lines[index] ?? "")) {
        rows.push(parseTableRow(lines[index] ?? ""));
        index += 1;
      }

      blocks.push({ headers, id: id++, rows, type: "table" });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];

      while (
        index < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[index] ?? "") : /^\s*[-*]\s+/.test(lines[index] ?? ""))
      ) {
        items.push((lines[index] ?? "").replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ""));
        index += 1;
      }

      blocks.push({ id: id++, items, ordered, type: "list" });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length && canContinueParagraph(lines, index)) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }

    blocks.push({ id: id++, type: "paragraph", value: paragraphLines.join(" ") });
  }

  return blocks;
}

function canContinueParagraph(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";

  return (
    line.trim().length > 0 &&
    !line.startsWith("```") &&
    !/^(#{1,6})\s+/.test(line) &&
    !/^(-{3,}|\*{3,})$/.test(line.trim()) &&
    !isTableStart(lines, index) &&
    !/^\s*[-*]\s+/.test(line) &&
    !/^\s*\d+\.\s+/.test(line)
  );
}

function isTableStart(lines: string[], index: number): boolean {
  return isTableRow(lines[index] ?? "") && isTableDivider(lines[index + 1] ?? "");
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isTableDivider(line: string): boolean {
  const cells = parseTableRow(line);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = value;
  let key = 0;

  while (remaining.length > 0) {
    const next = findNextInlineToken(remaining);

    if (!next) {
      nodes.push(remaining);
      break;
    }

    if (next.index > 0) {
      nodes.push(remaining.slice(0, next.index));
    }

    const match = remaining.slice(next.index).match(next.pattern);

    if (!match) {
      nodes.push(remaining);
      break;
    }

    if (next.type === "code") {
      nodes.push(
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" key={key++}>
          {match[1]}
        </code>
      );
    }

    if (next.type === "link") {
      nodes.push(
        <a
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={safeHref(match[2])}
          key={key++}
          rel="noreferrer"
          target={isExternalHref(match[2]) ? "_blank" : undefined}
        >
          {match[1]}
        </a>
      );
    }

    if (next.type === "strong") {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    }

    if (next.type === "em") {
      nodes.push(<em key={key++}>{match[1]}</em>);
    }

    remaining = remaining.slice(next.index + match[0].length);
  }

  return nodes;
}

function findNextInlineToken(
  value: string
): { index: number; pattern: RegExp; type: "code" | "em" | "link" | "strong" } | null {
  const patterns = [
    { pattern: /^`([^`]+)`/, token: /`[^`]+`/, type: "code" as const },
    { pattern: /^\[([^\]]+)\]\(([^)]+)\)/, token: /\[[^\]]+\]\([^)]+\)/, type: "link" as const },
    { pattern: /^\*\*([^*]+)\*\*/, token: /\*\*[^*]+\*\*/, type: "strong" as const },
    { pattern: /^\*([^*]+)\*/, token: /\*[^*]+\*/, type: "em" as const }
  ];

  return (
    patterns
      .map(({ pattern, token, type }) => ({ index: value.search(token), pattern, type }))
      .filter((candidate) => candidate.index >= 0)
      .sort((left, right) => left.index - right.index)[0] ?? null
  );
}

function safeHref(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^(https?:\/\/|mailto:|#|\/)/.test(value)) {
    return value;
  }

  return undefined;
}

function isExternalHref(value: string | undefined): boolean {
  return Boolean(value && /^https?:\/\//.test(value));
}
