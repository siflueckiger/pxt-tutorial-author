import { DEFAULT_META, type TutorialDoc, type TutorialStep } from "./types.ts";

/**
 * Renders a tutorial document into MakeCode tutorial Markdown.
 *
 * Tutorial-wide options become `### @KEY VALUE` metadata lines, each step
 * becomes a `## Heading`, and its code is emitted in a fenced block whose
 * language tag matches the step kind (`blocks`, `template` or `ghost`).
 */
export function tutorialToMarkdown(doc: TutorialDoc): string {
  const lines: string[] = [];

  lines.push(`# ${doc.title.trim() || "Untitled tutorial"}`);
  lines.push("");

  const meta = doc.meta ?? DEFAULT_META;
  const metadata: [string, boolean][] = [
    ["explicitHints", meta.explicitHints],
    ["diffs", meta.diffs],
    ["hideIteration", meta.hideIteration],
    ["hideDone", meta.hideDone],
    ["hideToolbox", meta.hideToolbox],
    ["unifiedToolbox", meta.unifiedToolbox],
  ];
  for (const [key, enabled] of metadata) {
    if (!enabled) continue;
    lines.push(`### @${key} true`);
    lines.push("");
  }

  doc.steps.forEach((step, index) => {
    lines.push(`## ${headingFor(step, index)}`);
    lines.push("");

    const description = step.description.trim();
    if (description) {
      lines.push(description);
      lines.push("");
    }

    const accordion = accordionLines(step.accordionHint);
    if (accordion.length > 0) {
      lines.push(...accordion);
      lines.push("");
    }

    const code = step.code.trim();
    if (code) {
      lines.push("```" + step.kind);
      lines.push(code);
      lines.push("```");
      lines.push("");
    }
  });

  return lines.join("\n").replace(/\n+$/, "") + "\n";
}

function headingFor(step: TutorialStep, index: number): string {
  const title = step.title.trim() || `Step ${index + 1}`;
  return step.modifier && step.modifier !== "none"
    ? `${title} @${step.modifier}`
    : title;
}

function accordionLines(text: string): string[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return [];

  const [first, ...rest] = trimmed.split("\n");
  const lines = [`~hint ${first}`];
  for (const line of rest) {
    lines.push(line.trim() ? `  ${line}` : "");
  }
  lines.push("hint~");
  return lines;
}

/**
 * Picks the most useful representation of the current workspace from the
 * project files returned by `extusercode`.
 *
 * `main.ts` (generated from the blocks) is preferred because it is compact and
 * readable; `main.blocks` (Blockly XML) is used as a fallback.
 */
export function extractWorkspaceCode(files: Record<string, string>): string {
  const ts = files["main.ts"];
  if (ts && hasRealCode(ts)) {
    return ts.trim();
  }

  const blocks = files["main.blocks"];
  if (blocks && blocks.trim()) {
    return blocks.trim();
  }

  return "";
}

function hasRealCode(code: string): boolean {
  const stripped = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith("//"));
  return stripped.length > 0;
}
