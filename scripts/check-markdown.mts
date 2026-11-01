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
      imageUrl: "https://example.com/heart.png",
      code: "basic.showIcon(IconNames.Heart)",
      kind: "blocks",
      modifier: "none",
      accordionHint: "Why a heart?\nIt is a friendly icon.",
    },
    {
      id: "b",
      title: "Pause between icons",
      description: "",
      imageUrl: "",
      code: "basic.showIcon(IconNames.Heart)\nbasic.pause(200)",
      kind: "blocks",
      modifier: "showhint",
      accordionHint: "",
    },
    {
      id: "c",
      title: "",
      description: "Shown in toolbox",
      imageUrl: "",
      code: "basic.pause(100)",
      kind: "ghost",
      modifier: "none",
      accordionHint: "",
    },
    {
      id: "d",
      title: "Starter",
      description: "Pre-loaded workspace",
      imageUrl: "",
      code: "basic.showIcon(IconNames.SmallHeart)",
      kind: "template",
      modifier: "none",
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
    "has accordion with indented continuation",
    md.includes("~hint Why a heart?\n  It is a friendly icon.\nhint~"),
  ],
  [
    "has blocks fence",
    md.includes("```blocks\nbasic.showIcon(IconNames.Heart)\n```"),
  ],
  [
    "has step image after description",
    md.includes(
      "Show a heart.\n\n![Make it flash](https://example.com/heart.png)",
    ),
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
      imageUrl: "",
      code: "basic.showIcon(IconNames.Heart)",
      kind: "blocks",
      modifier: "none",
      accordionHint: "",
    },
  ],
};
checks.push(["clean tutorial has no issues", checkTutorial(cleanDoc).length === 0]);

// --- Image URL checks ---------------------------------------------------

const relativeImageDoc: TutorialDoc = {
  version: 2,
  title: "Relative image",
  meta: { ...DEFAULT_META },
  steps: [
    {
      ...doc.steps[0],
      imageUrl: "/static/agent-tower.png",
      modifier: "showhint",
    },
  ],
};
checks.push([
  "flags relative image URLs",
  checkTutorial(relativeImageDoc).some((issue) =>
    issue.message.includes("Relative image paths"),
  ),
]);

const httpImageDoc: TutorialDoc = {
  version: 2,
  title: "Insecure image",
  meta: { ...DEFAULT_META },
  steps: [
    {
      ...doc.steps[0],
      imageUrl: "http://example.com/a.png",
      modifier: "showhint",
    },
  ],
};
checks.push([
  "flags http image URLs",
  checkTutorial(httpImageDoc).some((issue) =>
    issue.message.includes("https://"),
  ),
]);

const hiddenImageDoc: TutorialDoc = {
  version: 2,
  title: "Hidden image",
  meta: { ...DEFAULT_META },
  steps: [
    {
      ...doc.steps[0],
      imageUrl: "https://example.com/a.png",
      modifier: "none",
    },
  ],
};
checks.push([
  "tips about images hidden behind the hint button",
  checkTutorial(hiddenImageDoc).some((issue) =>
    issue.message.includes("hint button"),
  ),
]);

const visibleImageDoc: TutorialDoc = {
  version: 2,
  title: "Visible image",
  meta: { ...DEFAULT_META },
  steps: [
    {
      ...doc.steps[0],
      imageUrl: "https://example.com/a.png",
      modifier: "showhint",
    },
  ],
};
checks.push([
  "accepts https images on @showhint steps",
  checkTutorial(visibleImageDoc).every(
    (issue) => !issue.message.toLowerCase().includes("image"),
  ),
]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
console.log(`${checks.length - failed}/${checks.length} passed`);
if (failed > 0) process.exit(1);
