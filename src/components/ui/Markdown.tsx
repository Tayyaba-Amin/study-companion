import { memo } from "react";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Render inline Markdown: bold, italic, strikethrough, code, links, images. */
function renderInline(text: string): string {
  // Escape first, then apply formatting in order
  let html = escapeHtml(text);

  // Images: ![alt](url)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    `<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2" />`,
  );

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    "<a href='$2' target='_blank' rel='noopener noreferrer' class='underline text-primary hover:text-secondary transition-colors'>$1</a>",
  );

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, "<del class='text-foreground/60'>$1</del>");

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong class='font-bold'>$1</strong>");

  // Italic: *text* (but not ** which is already handled)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Inline code: `text`
  html = html.replace(
    /`(.+?)`/g,
    "<code class='bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground'>$1</code>",
  );

  return html;
}

/** Split a block of text into table rows. Returns null if not a table. */
function tryParseTable(lines: string[]): {
  header: string[];
  align: ("left" | "center" | "right" | null)[];
  rows: string[][];
} | null {
  if (lines.length < 2) return null;
  // Check if first line looks like a table header
  if (!lines[0].trim().startsWith("|")) return null;
  const headerCells = lines[0]
    .split("|")
    .slice(1, -1)
    .map((s) => s.trim());
  if (headerCells.length === 0) return null;

  // Check if second line is the alignment row
  const alignRow = lines[1].trim();
  if (!alignRow.startsWith("|")) return null;
  const alignParts = alignRow
    .split("|")
    .slice(1, -1)
    .map((s) => s.trim());
  const align = alignParts.map((part) => {
    if (part.startsWith(":") && part.endsWith(":")) return "center" as const;
    if (part.endsWith(":")) return "right" as const;
    if (part.startsWith(":")) return "left" as const;
    return null;
  });

  // Only proceed if the alignment row looks like dashes
  if (!alignRow.replace(/[:\-| ]/g, "").length) {
    // It's a valid table
    const rows: string[][] = [];
    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i]
        .split("|")
        .slice(1, -1)
        .map((s) => s.trim());
      if (parts.length > 0) {
        rows.push(parts);
      }
    }
    return { header: headerCells, align, rows };
  }

  return null;
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];

  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let codeBlockBuffer: string[] | null = null;
  let codeBlockLang = "";
  let blockquoteBuffer: string[] = [];
  let tableBuffer: string[] | null = null;

  let keyCounter = 0;

  function nextKey(): number {
    return keyCounter++;
  }

  function pushBlock(node: React.ReactNode) {
    blocks.push(node);
  }

  function flushList() {
    if (!listType || listBuffer.length === 0) return;
    const Tag = listType === "ul" ? "ul" : "ol";
    const cls = listType === "ul" ? "list-disc" : "list-decimal";
    pushBlock(
      <Tag key={nextKey()} className={`${cls} pl-6 space-y-1.5 my-3 text-foreground`}>
        {listBuffer.map((item, i) => (
          <li
            key={i}
            dangerouslySetInnerHTML={{
              __html: renderInline(
                item.replace(/^[-*+]\s/, "").replace(/^\d+\.\s/, ""),
              ),
            }}
          />
        ))}
      </Tag>,
    );
    listBuffer = [];
    listType = null;
  }

  function flushBlockquote() {
    if (blockquoteBuffer.length === 0) return;
    const content = blockquoteBuffer
      .map((line) => line.replace(/^>\s?/, ""))
      .join("\n");
    // Render inner markdown recursively for blockquotes
    pushBlock(
      <blockquote
        key={nextKey()}
        className="border-l-4 border-primary/40 pl-4 my-3 text-foreground/80 italic space-y-1"
      >
        <Markdown text={content} />
      </blockquote>,
    );
    blockquoteBuffer = [];
  }

  function flushTable() {
    if (!tableBuffer) return;
    const parsed = tryParseTable(tableBuffer);
    if (parsed) {
      const alignMap = (a: "left" | "center" | "right" | null) => {
        if (a === "center") return "text-center";
        if (a === "right") return "text-right";
        return "text-left";
      };
      pushBlock(
        <div key={nextKey()} className="overflow-x-auto my-3">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                {parsed.header.map((cell, i) => (
                  <th
                    key={i}
                    className={`px-3 py-2 font-semibold text-foreground ${alignMap(parsed.align[i] ?? null)}`}
                    dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border even:bg-muted/50">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 text-foreground/80 ${alignMap(parsed.align[ci] ?? null)}`}
                      dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
    tableBuffer = null;
  }

  function flushAll() {
    flushList();
    flushBlockquote();
    flushTable();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Fenced code block ──
    if (/^```/.test(trimmed)) {
      flushAll();
      if (codeBlockBuffer === null) {
        // Opening fence
        codeBlockLang = trimmed.replace(/^```/, "").trim();
        codeBlockBuffer = [];
      } else {
        // Closing fence
        const code = codeBlockBuffer.join("\n");
        pushBlock(
          <pre
            key={nextKey()}
            className="my-3 rounded-xl bg-muted/80 border border-border text-foreground p-4 overflow-x-auto text-sm leading-relaxed"
          >
            {codeBlockLang && (
              <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
                {codeBlockLang}
              </div>
            )}
            <code className="font-mono whitespace-pre">{code}</code>
          </pre>,
        );
        codeBlockBuffer = null;
        codeBlockLang = "";
      }
      continue;
    }

    // Inside a code block — collect lines verbatim
    if (codeBlockBuffer !== null) {
      codeBlockBuffer.push(line);
      continue;
    }

    // ── Horizontal rule ──
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
      flushAll();
      pushBlock(
        <hr key={nextKey()} className="my-4 border-border" />,
      );
      continue;
    }

    // ── Blank line ──
    if (!trimmed) {
      // If we're in a table, blank line ends the table
      if (tableBuffer) {
        flushTable();
      }
      flushList();
      flushBlockquote();
      // Insert paragraph spacing
      pushBlock(<div key={nextKey()} className="h-2" />);
      continue;
    }

    // ── Blockquote ──
    if (/^>\s?/.test(trimmed)) {
      flushList();
      flushTable();
      blockquoteBuffer.push(trimmed);
      continue;
    }

    // ── Table row ──
    if (/^\|.+\|$/.test(trimmed)) {
      flushList();
      flushBlockquote();
      if (tableBuffer === null) {
        tableBuffer = [];
      }
      tableBuffer.push(trimmed);
      // Don't create a standalone block for table rows — they're flushed together
      continue;
    }

    // If we were collecting a table and hit a non-table line, flush it
    if (tableBuffer) {
      flushTable();
    }

    // ── Heading ──
    if (/^#{1,4}\s/.test(trimmed)) {
      flushAll();
      const level = (trimmed.match(/^#+/)?.[0].length ?? 2) as 1 | 2 | 3 | 4;
      const content = renderInline(trimmed.replace(/^#+\s/, ""));
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : level === 3 ? "h4" : "h5";
      const size =
        level === 1
          ? "text-xl font-heading font-bold mt-6 mb-2 text-foreground"
          : level === 2
          ? "text-lg font-heading font-semibold mt-5 mb-1.5 text-foreground"
          : level === 3
          ? "text-base font-heading font-semibold mt-4 mb-1 text-foreground"
          : "text-sm font-heading font-semibold mt-3 mb-1 text-foreground/90";
      pushBlock(
        <Tag
          key={nextKey()}
          className={size}
          dangerouslySetInnerHTML={{ __html: content }}
        />,
      );
      continue;
    }

    // ── Bullet list ──
    if (/^[-*+]\s/.test(trimmed)) {
      if (listType !== "ul") flushAll();
      listType = "ul";
      listBuffer.push(trimmed);
      continue;
    }

    // ── Numbered list ──
    if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== "ol") flushAll();
      listType = "ol";
      listBuffer.push(trimmed);
      continue;
    }

    // ── Paragraph ──
    flushAll();
    const html = renderInline(line);
    if (html) {
      pushBlock(
        <p
          key={nextKey()}
          className="my-2 leading-relaxed text-foreground/85"
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
    }
  }

  // Flush any remaining buffers
  flushAll();
  if (codeBlockBuffer !== null) {
    // Unclosed code block — render what we have
    pushBlock(
      <pre key={nextKey()} className="my-3 rounded-xl bg-muted/80 border border-border text-foreground p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono whitespace-pre">{codeBlockBuffer.join("\n")}</code>
      </pre>,
    );
  }

  return <div className="space-y-1">{blocks}</div>;
});