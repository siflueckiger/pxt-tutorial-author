import { useEffect, useState } from "react";
import {
  STEP_KINDS,
  STEP_MODIFIERS,
  type StepKind,
  type StepModifier,
  type TutorialStep,
} from "../model/types";

interface StepEditorProps {
  step: TutorialStep;
  onChange: (patch: Partial<TutorialStep>) => void;
  onCapture: () => void;
  busy: boolean;
  captureDisabled: boolean;
}

export function StepEditor({
  step,
  onChange,
  onCapture,
  busy,
  captureDisabled,
}: StepEditorProps) {
  const kind = STEP_KINDS.find((option) => option.value === step.kind);
  const modifier = STEP_MODIFIERS.find(
    (option) => option.value === step.modifier,
  );

  return (
    <section className="editor">
      <label className="field">
        <span className="field__label">Step title</span>
        <input
          className="input"
          value={step.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>

      <label className="field">
        <span className="field__label">Description</span>
        <textarea
          className="input input--area"
          rows={3}
          value={step.description}
          placeholder="What should the learner do in this step?"
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>

      <div className="field">
        <span className="field__label">Image URL</span>
        <input
          className="input"
          value={step.imageUrl}
          placeholder="https://raw.githubusercontent.com/…/intro.png"
          onChange={(event) => onChange({ imageUrl: event.target.value })}
        />
        <span className="field__hint">
          Absolute https URL. Shown by @showhint / @showdialog, or behind the
          hint button on normal steps.
        </span>
        {step.imageUrl.trim() ? (
          <ImagePreview url={step.imageUrl.trim()} />
        ) : null}
      </div>

      <div className="field">
        <span className="field__label">Step modifier</span>
        <select
          className="input"
          value={step.modifier}
          onChange={(event) =>
            onChange({ modifier: event.target.value as StepModifier })
          }
        >
          {STEP_MODIFIERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="field__callout">
          <span className="field__calloutTitle">
            What does {modifier?.label.split(" — ")[0]} do?
          </span>
          <span className="field__calloutText">{modifier?.hint}</span>
        </div>
        <span className="field__note">
          MakeCode renamed @fullscreen to @showhint and @unplugged to
          @showdialog.
        </span>
      </div>

      <label className="field">
        <span className="field__label">Accordion hint</span>
        <textarea
          className="input input--area"
          rows={2}
          value={step.accordionHint}
          placeholder="Optional. The first line is the summary learners click."
          onChange={(event) =>
            onChange({ accordionHint: event.target.value })
          }
        />
      </label>

      <div className="field">
        <span className="field__label">Block type</span>
        <select
          className="input"
          value={step.kind}
          onChange={(event) =>
            onChange({ kind: event.target.value as StepKind })
          }
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
            disabled={busy || captureDisabled}
            title={
              captureDisabled
                ? "Exit the test run to capture from the authoring workspace"
                : undefined
            }
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
          onChange={(event) => onChange({ code: event.target.value })}
        />
      </div>
    </section>
  );
}

function ImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (failed) {
    return (
      <span className="imagePreview imagePreview--error">
        Preview failed to load — check the URL.
      </span>
    );
  }

  return (
    <img
      className="imagePreview"
      src={url}
      alt="Step image preview"
      onError={() => setFailed(true)}
    />
  );
}
