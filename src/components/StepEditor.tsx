import {
  STEP_KINDS,
  type StepKind,
  type TutorialStep,
} from "../model/types";

interface StepEditorProps {
  step: TutorialStep;
  onChange: (patch: Partial<TutorialStep>) => void;
  onCapture: () => void;
  busy: boolean;
}

export function StepEditor({
  step,
  onChange,
  onCapture,
  busy,
}: StepEditorProps) {
  const kind = STEP_KINDS.find((option) => option.value === step.kind);

  return (
    <section className="editor">
      <label className="field">
        <span className="field__label">Step title</span>
        <input
          className="input"
          value={step.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field__label">Description</span>
        <textarea
          className="input input--area"
          rows={3}
          value={step.description}
          placeholder="What should the learner do in this step?"
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </label>

      <div className="field">
        <span className="field__label">Block type</span>
        <select
          className="input"
          value={step.kind}
          onChange={(e) => onChange({ kind: e.target.value as StepKind })}
        >
          {STEP_KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="field__hint">{kind?.hint}</span>
      </div>

      <div className="field">
        <div className="field__row">
          <span className="field__label">Blocks / code</span>
          <button
            type="button"
            className="btn btn--small"
            onClick={onCapture}
            disabled={busy}
          >
            Capture from workspace
          </button>
        </div>
        <textarea
          className="input input--code"
          rows={10}
          spellCheck={false}
          value={step.code}
          placeholder="basic.showIcon(IconNames.Heart)"
          onChange={(e) => onChange({ code: e.target.value })}
        />
      </div>
    </section>
  );
}
