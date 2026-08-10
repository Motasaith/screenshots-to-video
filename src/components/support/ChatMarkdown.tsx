import { Fragment, type ReactNode } from "react";

/**
 * The small amount of markdown a chat reply actually uses.
 *
 * The model emits `**bold**`, `` `code` ``, `- ` bullets and blank-line
 * paragraphs whether or not you ask it to, and those were rendering as literal
 * asterisks in the transcript.
 *
 * Builds React nodes rather than an HTML string. The text comes from a language
 * model that is repeating things users typed at it, so `dangerouslySetInnerHTML`
 * here would be an injection route for anyone who could get the model to echo a
 * tag back. Nodes cannot inject markup by construction.
 *
 * Deliberately not a full markdown parser: no tables, no images, no raw HTML, no
 * links yet. Support replies do not need them, and every extra construct is more
 * surface for a reply to render as something unintended.
 */

export function ChatMarkdown({ text }: { text: string }) {
  return <>{renderBlocks(text)}</>;
}

function renderBlocks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Blank lines separate blocks; single newlines stay inside one.
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  blocks.forEach((block, blockIndex) => {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    // Group consecutive runs of the same kind.
    //
    // A model almost always writes an intro line and its bullets in one block:
    //
    //   Check the Script panel and make sure:
    //   - a voice is selected
    //   - the script box is not empty
    //
    // Requiring every line in a block to be a bullet meant that rendered as one
    // paragraph with line breaks, so the list never appeared.
    let run: { kind: "p" | "ul" | "ol"; lines: string[] } | null = null;
    const runs: Array<{ kind: "p" | "ul" | "ol"; lines: string[] }> = [];

    for (const line of lines) {
      const kind: "p" | "ul" | "ol" = /^\s*[-*•]\s+/.test(line)
        ? "ul"
        : /^\s*\d+[.)]\s+/.test(line)
          ? "ol"
          : "p";
      if (run && run.kind === kind) run.lines.push(line);
      else {
        run = { kind, lines: [line] };
        runs.push(run);
      }
    }

    runs.forEach((r, runIndex) => {
      const key = `${blockIndex}-${runIndex}`;
      const spaced = blockIndex > 0 || runIndex > 0;

      if (r.kind === "ul") {
        out.push(
          <ul key={`ul-${key}`} className="my-1.5 list-disc space-y-1 pl-4">
            {r.lines.map((line, i) => (
              <li key={i}>{renderInline(line.replace(/^\s*[-*•]\s+/, ""))}</li>
            ))}
          </ul>
        );
        return;
      }

      if (r.kind === "ol") {
        out.push(
          <ol key={`ol-${key}`} className="my-1.5 list-decimal space-y-1 pl-4">
            {r.lines.map((line, i) => (
              <li key={i}>{renderInline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>
            ))}
          </ol>
        );
        return;
      }

      out.push(
        <p key={`p-${key}`} className={spaced ? "mt-2" : undefined}>
          {r.lines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 ? <br /> : null}
              {renderInline(line)}
            </Fragment>
          ))}
        </p>
      );
    });
  });

  return out;
}

/**
 * Inline emphasis, innermost last.
 *
 * Code spans are taken first and not descended into, so a reply containing
 * `**not bold**` inside backticks stays literal, which is what someone quoting
 * markdown at us expects.
 */
function renderInline(text: string): ReactNode[] {
  return splitOn(
    text,
    /`([^`]+)`/g,
    (m, key) => (
      <code
        key={key}
        className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.9em]"
      >
        {m}
      </code>
    ),
    (plain, key) => <Fragment key={key}>{renderBold(plain)}</Fragment>
  );
}

function renderBold(text: string): ReactNode[] {
  return splitOn(
    text,
    /\*\*(.+?)\*\*|__(.+?)__/g,
    (m, key) => (
      <strong key={key} className="font-semibold">
        {renderItalic(m)}
      </strong>
    ),
    (plain, key) => <Fragment key={key}>{renderItalic(plain)}</Fragment>
  );
}

function renderItalic(text: string): ReactNode[] {
  // A single `*` or `_` surrounded by non-space, so `a * b` and snake_case are
  // left alone.
  return splitOn(
    text,
    /(?<![*\w])\*([^*\s][^*]*)\*(?![*\w])|(?<![_\w])_([^_\s][^_]*)_(?![_\w])/g,
    (m, key) => <em key={key}>{m}</em>,
    (plain, key) => <Fragment key={key}>{plain}</Fragment>
  );
}

/**
 * Walk `text` with `pattern`, wrapping matches with `onMatch` and the gaps with
 * `onPlain`. One helper because all three passes above have the same shape.
 */
function splitOn(
  text: string,
  pattern: RegExp,
  onMatch: (inner: string, key: string) => ReactNode,
  onPlain: (plain: string, key: string) => ReactNode
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(onPlain(text.slice(last, match.index), `t${last}`));
    // Alternation means the captured group can be in either slot.
    const inner = match[1] ?? match[2] ?? "";
    out.push(onMatch(inner, `m${match.index}`));
    last = match.index + match[0].length;
    // A zero-length match would spin forever.
    if (match[0].length === 0) re.lastIndex++;
  }

  if (last < text.length) out.push(onPlain(text.slice(last), `t${last}`));
  return out;
}
