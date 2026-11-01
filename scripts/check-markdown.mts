import { tutorialToMarkdown, extractWorkspaceCode } from "../src/model/markdown.ts";
import type { TutorialDoc } from "../src/model/types.ts";

const doc: TutorialDoc = {
  version: 1,
  title: "Flashing heart",
  explicitHints: true,
  steps: [
    {
      id: "a",
      title: "Step 1",
      description: "Show a heart.",
      code: "basic.showIcon(IconNames.Heart)",
      kind: "blocks",
    },
    {
      id: "b",
      title: "",
      description: "",
      code: "basic.showIcon(IconNames.Heart)",
      kind: "template",
    },
    {
      id: "c",
      title: "Only helper blocks",
      description: "Shown in toolbox",
      code: "basic.pause(100)",
      kind: "ghost",
    },
  ],
};

const md = tutorialToMarkdown(doc);
console.log("===== MARKDOWN =====");
console.log(md);

const checks: [string, boolean][] = [
  ["starts with title", md.startsWith("# Flashing heart\n")],
  ["has explicitHints", md.includes("### @explicitHints true")],
  ["has step heading", md.includes("## Step 1")],
  ["has description", md.includes("Show a heart.")],
  ["has blocks fence", md.includes("```blocks\nbasic.showIcon(IconNames.Heart)\n```")],
  ["has template fence", md.includes("```template")],
  ["has ghost fence", md.includes("```ghost\nbasic.pause(100)\n```")],
  ["blank title falls back to Step 2", md.includes("## Step 2")],
  ["empty description omitted", !md.includes("\n\n\n")],
  ["ends with one newline", md.endsWith("```\n")],
];

const ws1 = extractWorkspaceCode({
  "main.ts": "basic.showIcon(IconNames.Heart)\n",
});
const ws2 = extractWorkspaceCode({ "main.ts": "// empty\n", "main.blocks": "<xml/>" });
const ws3 = extractWorkspaceCode({ "main.ts": "//\n" });

checks.push(["prefers main.ts", ws1 === "basic.showIcon(IconNames.Heart)"]);
checks.push(["falls back to main.blocks", ws2 === "<xml/>"]);
checks.push(["empty when nothing", ws3 === ""]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
console.log(`${checks.length - failed}/${checks.length} passed`);
if (failed > 0) process.exit(1);
