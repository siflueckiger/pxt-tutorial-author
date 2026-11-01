import {
  tutorialToMarkdown,
  extractWorkspaceCode,
} from "../src/model/markdown.ts";
import {
  captionText,
  checkTutorial,
  diffCode,
  CAPTION_SOFT_LIMIT,
} from "../src/model/checks.ts";
import { DEFAULT_META, type TutorialDoc } from "../src/model/types.ts";

const doc: TutorialDoc = {
  version: 2,
  title: "Flashing heart",
  meta: { ...DEFAULT_META, explicitHints: true, diffs: true },
  steps: [
    {
      id: "a",
      title: "Make it flash",
      description: "Show a heart.",
      code: "basic.showIcon(IconNames.Heart)",
      kind: "blocks",
      modifier: "none",
      instructions: [{ icon: "basic", text: "From the Basic category" }],
      accordionHint: "Why a heart?\nIt is a friendly icon.",
    },
    {
      id: "b",
      title: "Pause between icons",
      description: "",
      code: "basic.showIcon(IconNames.Heart)\nbasic.pause(200)",
      kind: "blocks",
      modifier: "showhint",
      instructions: [],
      accordionHint: "",
    },
    {
      id: "c",
      title: "",
      description: "Shown in toolbox",
      code: "basic.pause(100)",
      kind: "ghost",
      modifier: "none",
      instructions: [],
      accordionHint: "",
    },
    {
      id: "d",
      title: "Starter",
      description: "Pre-loaded workspace",
      code: "basic.showIcon(IconNames.SmallHeart)",
      kind: "template",
      modifier: "none",
      instructions: [],
      accordionHint: "",
    },
  ],
};

const md = tutorialToMarkdown(doc);
console.log("===== MARKDOWN =====");
console.log(md);

const checks: [string, boolean][] = [
  ["starts with title", md.startsWith("# Flashing heart\n")],
  ["has explicitHints", md.includes("### @explicitHints true")],
  ["has diffs", md.includes("### @diffs true")],
  ["does not emit disabled metadata", !md.includes("@hideIteration")],
  ["has step heading", md.includes("## Make it flash\n")],
  ["has step modifier", md.includes("## Pause between icons @showhint")],
  [
    "has icon bullet",
    md.includes("- :basic: From the Basic category"),
  ],
  [
    "has accordion with indented continuation",
    md.includes("~hint Why a heart?\n  It is a friendly icon.\nhint~"),
  ],
  [
    "has blocks fence",
    md.includes("```blocks\nbasic.showIcon(IconNames.Heart)\n```"),
  ],
  ["has ghost fence", md.includes("```ghost\nbasic.pause(100)\n```")],
  ["has template fence", md.includes("```template")],
  ["blank title falls back to Step 3", md.includes("## Step 3\n")],
  ["ends with one newline", md.endsWith("```\n")],
];

const ws1 = extractWorkspaceCode({
  "main.ts": "basic.showIcon(IconNames.Heart)\n",
});
const ws2 = extractWorkspaceCode({
  "main.ts": "// empty\n",
  "main.blocks": "<xml/>",
});
const ws3 = extractWorkspaceCode({ "main.ts": "//\n" });

checks.push(["prefers main.ts", ws1 === "basic.showIcon(IconNames.Heart)"]);
checks.push(["falls back to main.blocks", ws2 === "<xml/>"]);
checks.push(["empty when nothing", ws3 === ""]);

// --- Code diffs ---------------------------------------------------------

const addOnly = diffCode("a\nb", "a\nb\nc");
checks.push(["diff counts additions", addOnly?.added === 1 && addOnly?.removed === 0]);

const removeOnly = diffCode("a\nb", "b");
checks.push([
  "diff counts removals",
  removeOnly?.added === 0 && removeOnly?.removed === 1,
]);

checks.push(["no diff for first step", diffCode(undefined, "x") === undefined]);

// --- Learning-design checks --------------------------------------------

const captionShort = captionText({
  ...doc.steps[0],
  description: "Short instruction.",
  instructions: [],
});
checks.push(["caption text includes description", captionShort === "Short instruction."]);

const longCaptionDoc: TutorialDoc = {
  version: 2,
  title: "Long captions",
  meta: { ...DEFAULT_META },
  steps: [
    {
      ...doc.steps[0],
      description: "x".repeat(CAPTION_SOFT_LIMIT + 10),
      instructions: [],
    },
  ],
};
checks.push([
  "flags long captions",
  checkTutorial(longCaptionDoc).some((issue) => issue.message.includes("Caption is")),
]);

const duplicateDoc: TutorialDoc = {
  version: 2,
  title: "Duplicates",
  meta: { ...DEFAULT_META },
  steps: [
    { ...doc.steps[0], title: "One" },
    { ...doc.steps[1], title: "Two", code: doc.steps[0].code },
  ],
};
checks.push([
  "flags identical consecutive steps",
  checkTutorial(duplicateDoc).some((issue) =>
    issue.message.includes("identical to the previous step"),
  ),
]);

const deprecatedDoc: TutorialDoc = {
  version: 2,
  title: "Deprecated",
  meta: { ...DEFAULT_META },
  steps: [
    {
      ...doc.steps[0],
      title: "Intro",
      description: "Welcome! @fullscreen",
      code: "",
    },
  ],
};
checks.push([
  "flags deprecated modifiers",
  checkTutorial(deprecatedDoc).some((issue) =>
    issue.message.includes("@showhint"),
  ),
]);

const cleanDoc: TutorialDoc = {
  version: 2,
  title: "Clean",
  meta: { ...DEFAULT_META },
  steps: [
    {
      id: "only",
      title: "One",
      description: "Do the thing.",
      code: "basic.showIcon(IconNames.Heart)",
      kind: "blocks",
      modifier: "none",
      instructions: [],
      accordionHint: "",
    },
  ],
};
checks.push(["clean tutorial has no issues", checkTutorial(cleanDoc).length === 0]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
console.log(`${checks.length - failed}/${checks.length} passed`);
if (failed > 0) process.exit(1);
