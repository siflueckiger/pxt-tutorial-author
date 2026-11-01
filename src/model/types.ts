export type StepKind = "blocks" | "template" | "ghost";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  /** Code (or block XML) snapshot for this step. */
  code: string;
  /** Which markdown fence the code is emitted under. */
  kind: StepKind;
}

export interface TutorialDoc {
  version: 1;
  title: string;
  explicitHints: boolean;
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

export function newStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyDoc(): TutorialDoc {
  return {
    version: 1,
    title: "",
    explicitHints: false,
    steps: [],
  };
}

/**
 * Local-dev seed so the panel is meaningful when opened outside the editor.
 */
export function createDemoDoc(): TutorialDoc {
  return {
    version: 1,
    title: "Flashing heart (demo)",
    explicitHints: false,
    steps: [
      {
        id: newStepId(),
        title: "Step 1",
        description: "Show a heart on the LED display.",
        code: "basic.showIcon(IconNames.Heart)",
        kind: "blocks",
      },
      {
        id: newStepId(),
        title: "Step 2",
        description: "Pause, then show a small heart to make it flash.",
        code:
          "basic.showIcon(IconNames.Heart)\n" +
          "basic.pause(200)\n" +
          "basic.showIcon(IconNames.SmallHeart)",
        kind: "blocks",
      },
    ],
  };
}
