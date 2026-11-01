export type StepKind = "blocks" | "template" | "ghost";

/** Step modifier rendered as `@showhint` / `@showdialog` in the step heading. */
export type StepModifier = "none" | "showhint" | "showdialog";

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
  /** Optional image shown with the step. Absolute https URLs are recommended. */
  imageUrl: string;
  /** Code (or block XML) snapshot for this step. */
  code: string;
  /** Which markdown fence the code is emitted under. */
  kind: StepKind;
  /** Special behavior for this step. */
  modifier: StepModifier;
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
  {
    value: "none",
    label: "None — normal step",
    hint: "Shown in the usual tutorial flow: short text in the caption, the rest in the hint.",
  },
  {
    value: "showhint",
    label: "@showhint — overlay",
    hint: "When learners reach this step, its content pops up in an overlay above the editor instead of the caption. Add an image URL to fill the overlay — that is what makes it feel dramatic. With plain text it mostly looks like an emphasised message.",
  },
  {
    value: "showdialog",
    label: "@showdialog — intro dialog",
    hint: "Shown in a dialog, then the tutorial automatically moves to the next step. Use it for an introduction before the hands-on steps.",
  },
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
    imageUrl: "",
    code: "",
    kind: "blocks",
    modifier: "none",
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
