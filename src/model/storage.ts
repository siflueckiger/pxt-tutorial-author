import {
  createEmptyDoc,
  newStepId,
  type StepKind,
  type StepModifier,
  type TutorialDoc,
  type TutorialMeta,
  type TutorialStep,
} from "./types.ts";

const STEP_KINDS: StepKind[] = ["blocks", "template", "ghost"];
const STEP_MODIFIERS: StepModifier[] = ["none", "showhint", "showdialog"];

export function serializeDoc(doc: TutorialDoc): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Parses a previously stored document, tolerating missing/old fields so the
 * panel keeps working if the schema grows.
 *
 * Version 1 documents stored `explicitHints` at the top level and had no
 * `meta`, `modifier` or `accordionHint` fields; those are migrated here.
 */
export function parseDoc(text: string | undefined): TutorialDoc | undefined {
  if (!text) return undefined;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }

  if (!isRecord(raw) || !Array.isArray(raw.steps)) return undefined;

  const doc: TutorialDoc = createEmptyDoc();
  doc.title = typeof raw.title === "string" ? raw.title : "";
  doc.meta = normalizeMeta(raw);
  doc.steps = raw.steps
    .filter(isRecord)
    .map((step, index) => normalizeStep(step, index));

  return doc;
}

function normalizeMeta(raw: Record<string, unknown>): TutorialMeta {
  const meta = isRecord(raw.meta) ? raw.meta : undefined;
  const legacyExplicitHints = raw.explicitHints === true;
  return {
    explicitHints:
      meta?.explicitHints === true ||
      (meta === undefined && legacyExplicitHints),
    diffs: meta?.diffs === true,
    hideIteration: meta?.hideIteration === true,
    hideDone: meta?.hideDone === true,
    hideToolbox: meta?.hideToolbox === true,
    unifiedToolbox: meta?.unifiedToolbox === true,
  };
}

function normalizeStep(
  raw: Record<string, unknown>,
  index: number,
): TutorialStep {
  const kind = typeof raw.kind === "string" ? raw.kind : "blocks";
  const modifier = typeof raw.modifier === "string" ? raw.modifier : "none";
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newStepId(),
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title
        : `Step ${index + 1}`,
    description: typeof raw.description === "string" ? raw.description : "",
    code: typeof raw.code === "string" ? raw.code : "",
    kind: STEP_KINDS.includes(kind as StepKind) ? (kind as StepKind) : "blocks",
    modifier: STEP_MODIFIERS.includes(modifier as StepModifier)
      ? (modifier as StepModifier)
      : "none",
    accordionHint:
      typeof raw.accordionHint === "string" ? raw.accordionHint : "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const DOC_STORAGE_KEY = "pxt-tutorial-author:doc";

export function loadDocFromStorage(): TutorialDoc | undefined {
  try {
    return parseDoc(window.localStorage.getItem(DOC_STORAGE_KEY) ?? undefined);
  } catch {
    return undefined;
  }
}

export function saveDocToStorage(doc: TutorialDoc): void {
  try {
    window.localStorage.setItem(DOC_STORAGE_KEY, serializeDoc(doc));
  } catch {
    // Ignore storage failures; in-memory editing still works.
  }
}
