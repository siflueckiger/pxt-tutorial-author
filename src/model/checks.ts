import {
  DEPRECATED_MODIFIERS,
  type TutorialDoc,
  type TutorialStep,
} from "./types.ts";

export type IssueSeverity = "warn" | "tip";

export interface TutorialIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
  stepId?: string;
}

/** Soft limit for step captions; longer text can hide behind MakeCode's "More" button. */
export const CAPTION_SOFT_LIMIT = 200;

export interface CodeDiff {
  added: number;
  removed: number;
}

/** Trims and drops blank lines and comment-only lines. */
export function normalizedLines(code: string): string[] {
  return code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));
}

function lineCounts(lines: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

/**
 * Line-based diff between two code snapshots. Only used for authoring hints,
 * so a multiset comparison is sufficient (it is order-insensitive).
 */
export function diffCode(
  previous: string | undefined,
  current: string | undefined,
): CodeDiff | undefined {
  if (previous === undefined) return undefined;

  const before = lineCounts(normalizedLines(previous));
  const after = lineCounts(normalizedLines(current ?? ""));

  let added = 0;
  let removed = 0;
  for (const [line, count] of after) {
    added += Math.max(0, count - (before.get(line) ?? 0));
  }
  for (const [line, count] of before) {
    removed += Math.max(0, count - (after.get(line) ?? 0));
  }
  return { added, removed };
}

/** The text shown in the tutorial caption: the step description. */
export function captionText(step: TutorialStep): string {
  return step.description.replace(/\s+/g, " ").trim();
}

function sameCode(a: TutorialStep, b: TutorialStep): boolean {
  return (
    normalizedLines(a.code).join("\n") === normalizedLines(b.code).join("\n")
  );
}

/**
 * Lightweight, objective authoring checks. These are hints for the author,
 * not a validation of the learner's code.
 */
export function checkTutorial(doc: TutorialDoc): TutorialIssue[] {
  const issues: TutorialIssue[] = [];
  let counter = 0;
  const add = (
    severity: IssueSeverity,
    message: string,
    stepId?: string,
  ): void => {
    issues.push({ id: `issue-${counter++}`, severity, message, stepId });
  };

  if (!doc.title.trim()) {
    add("warn", "Add a tutorial title — it becomes the heading learners see.");
  }
  if (doc.steps.length === 0) {
    add("warn", "Add at least one step.");
  }

  const templateSteps = doc.steps.filter((step) => step.kind === "template");
  if (templateSteps.length > 1) {
    add(
      "warn",
      "Only one template block is supported per tutorial.",
      templateSteps[1]?.id,
    );
  }
  if (templateSteps.length === 1) {
    const index = doc.steps.indexOf(templateSteps[0]);
    if (index !== 0 && index !== doc.steps.length - 1) {
      add(
        "tip",
        "Keep the template at the start or end of the tutorial so it does not break up the steps.",
        templateSteps[0].id,
      );
    }
  }

  doc.steps.forEach((step, index) => {
    const caption = captionText(step);
    if (caption.length > CAPTION_SOFT_LIMIT) {
      add(
        "warn",
        `Caption is ${caption.length} characters; MakeCode may hide part of it behind “More”. Shorten it or split the step.`,
        step.id,
      );
    }

    if (!step.description.trim()) {
      add("tip", "This step has no description.", step.id);
    }

    if (step.kind === "blocks" && !step.code.trim()) {
      add(
        "warn",
        "This step has no blocks — learners will have nothing to build.",
        step.id,
      );
    }

    const imageUrl = step.imageUrl.trim();
    if (imageUrl) {
      if (imageUrl.startsWith("/")) {
        add(
          "warn",
          "Relative image paths (/static/…) only work in official editor repositories. Use an absolute https URL for a GitHub-hosted tutorial.",
          step.id,
        );
      } else if (/^http:\/\//i.test(imageUrl)) {
        add(
          "warn",
          "Use https:// for image URLs; insecure http may be blocked.",
          step.id,
        );
      } else if (!/^https:\/\//i.test(imageUrl)) {
        add("warn", "Image URL should be an absolute https:// URL.", step.id);
      }

      if (step.modifier === "none") {
        add(
          "tip",
          "Images on normal steps are only visible behind the hint button. Use @showhint or @showdialog to show the image right away.",
          step.id,
        );
      }
    }

    const previous = doc.steps[index - 1];
    if (
      previous &&
      step.kind === "blocks" &&
      previous.kind === "blocks" &&
      sameCode(step, previous)
    ) {
      add(
        "warn",
        "The blocks are identical to the previous step — add the next change or merge the steps.",
        step.id,
      );
    }

    for (const deprecated of DEPRECATED_MODIFIERS) {
      if (
        deprecated.pattern.test(step.title) ||
        deprecated.pattern.test(step.description)
      ) {
        add(
          "warn",
          `${deprecated.label} is deprecated in MakeCode tutorials; use ${deprecated.replacement} instead.`,
          step.id,
        );
      }
    }
  });

  if (
    doc.steps.length >= 4 &&
    doc.steps.every((step) => step.kind === "blocks")
  ) {
    add(
      "tip",
      "Every step is a full worked example. As learners gain confidence you can fade scaffolding with lighter later steps.",
    );
  }

  return issues;
}
