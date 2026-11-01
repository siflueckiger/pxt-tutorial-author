export type StepKind = "blocks" | "template" | "ghost";

/** Step modifier rendered as `@showhint` / `@showdialog` in the step heading. */
export type StepModifier = "none" | "showhint" | "showdialog";

/** A single instruction bullet, optionally prefixed with an icon. */
export interface InstructionIcon {
  /** Semantic UI icon name without surrounding colons (e.g. `loops`). */
  icon: string;
  text: string;
}

/** Tutorial-wide metadata emitted as `### @KEY VALUE` lines. */
export interface TutorialMeta {
  explicitHints: boolean;
  diffs: boolean;
  hideIteration: boolean;
  hideDone: boolean;
  hideToolbox: boolean;
  unifiedToolbox: boolean;
}

export const DEFAULT_META: TutorialMeta = {
  explicitHints: false,
  diffs: false,
  hideIteration: false,
  hideDone: false,
  hideToolbox: false,
  unifiedToolbox: false,
};

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  /** Code (or block XML) snapshot for this step. */
  code: string;
  /** Which markdown fence the code is emitted under. */
  kind: StepKind;
  /** Special behavior for this step. */
  modifier: StepModifier;
  /** Instruction bullets shown with leading icons. */
  instructions: InstructionIcon[];
  /** Optional accordion hint (`~hint … hint~`). The first line is the summary. */
  accordionHint: string;
}

export interface TutorialDoc {
  version: 2;
  title: string;
  meta: TutorialMeta;
  steps: TutorialStep[];
}

export const STEP_KINDS: { value: StepKind; label: string; hint: string }[] = [
  {
    value: "blocks",
    label: "blocks",
    hint: "Hint / goal — the blocks the learner should build for this step.",
  },
  {
    value: "template",
    label: "template",
    hint: "Starting workspace — code pre-loaded before the learner begins.",
  },
  {
    value: "ghost",
    label: "ghost",
    hint: "Toolbox-only — blocks shown in the toolbox but not required.",
  },
];

export const STEP_MODIFIERS: {
  value: StepModifier;
  label: string;
  hint: string;
}[] = [
  { value: "none", label: "None", hint: "Normal step." },
  {
    value: "showhint",
    label: "@showhint",
    hint: "Show the step content in an overlay when the step is reached.",
  },
  {
    value: "showdialog",
    label: "@showdialog",
    hint: "Show the step in a dialog, then skip to the next step automatically.",
  },
];

/**
 * Common icons for instruction bullets. Toolbox category names (`loops`,
 * `input`, …) and a few Semantic UI icons used by MakeCode tutorials.
 */
export const ICON_SUGGESTIONS: string[] = [
  "basic",
  "input",
  "music",
  "led",
  "radio",
  "loops",
  "logic",
  "variables",
  "math",
  "functions",
  "arrays",
  "text",
  "game",
  "images",
  "pins",
  "serial",
  "control",
  "mouse pointer",
  "binoculars",
  "lightbulb",
  "computer",
  "paper plane",
  "tree",
  "lightning",
];

/** Deprecated in the MakeCode docs; surfaced by the checks panel. */
export const DEPRECATED_MODIFIERS: {
  label: string;
  pattern: RegExp;
  replacement: string;
}[] = [
  { label: "@fullscreen", pattern: /@fullscreen\b/i, replacement: "@showhint" },
  { label: "@unplugged", pattern: /@unplugged\b/i, replacement: "@showdialog" },
];

export function newStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStep(
  overrides: Partial<Omit<TutorialStep, "id">> = {},
): TutorialStep {
  return {
    id: newStepId(),
    title: "",
    description: "",
    code: "",
    kind: "blocks",
    modifier: "none",
    instructions: [],
    accordionHint: "",
    ...overrides,
  };
}

export function createEmptyDoc(): TutorialDoc {
  return {
    version: 2,
    title: "",
    meta: { ...DEFAULT_META },
    steps: [],
  };
}

/**
 * Local-dev seed so the panel is meaningful when opened outside the editor.
 */
export function createDemoDoc(): TutorialDoc {
  return {
    version: 2,
    title: "Flashing heart (demo)",
    meta: { ...DEFAULT_META },
    steps: [
      createStep({
        title: "Step 1",
        description: "Show a heart on the LED display.",
        code: "basic.showIcon(IconNames.Heart)",
      }),
      createStep({
        title: "Step 2",
        description: "Pause, then show a small heart to make it flash.",
        code:
          "basic.showIcon(IconNames.Heart)\n" +
          "basic.pause(200)\n" +
          "basic.showIcon(IconNames.SmallHeart)",
      }),
    ],
  };
}
