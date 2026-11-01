import { diffCode } from "../model/checks";
import type { TutorialStep } from "../model/types";

interface StepListProps {
  steps: TutorialStep[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (id: string) => void;
  captureDisabled: boolean;
}

export function StepList({
  steps,
  selectedId,
  onSelect,
  onMove,
  onDelete,
  onInsertAfter,
  captureDisabled,
}: StepListProps) {
  if (steps.length === 0) {
    return <div className="steps steps--empty">No steps yet.</div>;
  }

  return (
    <ol className="steps">
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1] : undefined;
        const diff = previous
          ? diffCode(previous.code, step.code)
          : undefined;

        return (
          <li
            key={step.id}
            className={
              "steps__item" +
              (step.id === selectedId ? " steps__item--active" : "")
            }
          >
            <button
              type="button"
              className="steps__main"
              onClick={() => onSelect(step.id)}
            >
              <span className="steps__index">{index + 1}</span>
              <span className="steps__label">
                <span className="steps__title">
                  {step.title.trim() || `Step ${index + 1}`}
                </span>
                <span className="steps__meta">
                  {step.kind}
                  {step.modifier !== "none" ? ` · @${step.modifier}` : ""}
                  {step.code.trim() ? "" : " · empty"}
                  {diff ? (
                    <>
                      {" · "}
                      <span className="steps__diffAdd">+{diff.added}</span>{" "}
                      <span className="steps__diffRemove">
                        −{diff.removed}
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
            </button>

            <div className="steps__controls">
              <button
                type="button"
                className="iconBtn"
                title="Move up"
                onClick={() => onMove(step.id, -1)}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="iconBtn"
                title="Move down"
                onClick={() => onMove(step.id, 1)}
                disabled={index === steps.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                className="iconBtn"
                title={
                  captureDisabled
                    ? "Exit the test run to insert a step"
                    : "Insert step after (captures current blocks)"
                }
                onClick={() => onInsertAfter(step.id)}
                disabled={captureDisabled}
              >
                ＋
              </button>
              <button
                type="button"
                className="iconBtn iconBtn--danger"
                title="Delete step"
                onClick={() => onDelete(step.id)}
              >
                ×
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
