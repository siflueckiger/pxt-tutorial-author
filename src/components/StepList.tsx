import type { TutorialStep } from "../model/types";

interface StepListProps {
  steps: TutorialStep[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (id: string) => void;
}

export function StepList({
  steps,
  selectedId,
  onSelect,
  onMove,
  onDelete,
  onInsertAfter,
}: StepListProps) {
  if (steps.length === 0) {
    return <div className="steps steps--empty">No steps yet.</div>;
  }

  return (
    <ol className="steps">
      {steps.map((step, index) => (
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
                {step.code.trim() ? "" : " · empty"}
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
              title="Insert step after (captures current blocks)"
              onClick={() => onInsertAfter(step.id)}
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
      ))}
    </ol>
  );
}
