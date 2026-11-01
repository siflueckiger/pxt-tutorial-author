import { useEffect, useRef, useState } from "react";
import {
  dataUrlByteSize,
  embedImageFile,
  formatBytes,
  isDataUrl,
} from "../model/image";
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | undefined>();
  const [dragging, setDragging] = useState(false);

  const acceptFile = async (file: File | undefined) => {
    if (!file) return;
    setImageError(undefined);
    setImageBusy(true);
    try {
      const dataUrl = await embedImageFile(file);
      onChange({ imageUrl: dataUrl });
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Could not process the image.",
      );
    } finally {
      setImageBusy(false);
    }
  };

  const openFilePicker = () => fileInputRef.current?.click();
  const imageUrl = step.imageUrl.trim();

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
        <span className="field__label">Image</span>

        <div
          className={"dropzone" + (dragging ? " dropzone--active" : "")}
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void acceptFile(event.dataTransfer.files[0]);
          }}
        >
          <span className="dropzone__label">
            {imageBusy
              ? "Processing image…"
              : "Drop an image here, or click to choose a file"}
          </span>
          <span className="dropzone__hint">
            PNG, JPEG or GIF · scaled to max 800px wide · embedded in the
            Markdown
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif"
          hidden
          onChange={(event) => {
            void acceptFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <input
          className="input"
          value={isDataUrl(step.imageUrl) ? "" : step.imageUrl}
          placeholder="…or paste an https:// image URL"
          onChange={(event) => onChange({ imageUrl: event.target.value })}
        />

        {imageError ? (
          <span className="field__hint field__hint--error">{imageError}</span>
        ) : null}

        {imageUrl ? (
          <div className="imageField">
            <ImagePreview url={imageUrl} />
            <div className="imageField__meta">
              <span className="field__hint">
                {isDataUrl(imageUrl)
                  ? `Embedded · ${formatBytes(dataUrlByteSize(imageUrl))}`
                  : "External URL"}
              </span>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => onChange({ imageUrl: "" })}
              >
                Remove image
              </button>
            </div>
          </div>
        ) : (
          <span className="field__hint">
            Images are shown by @showhint / @showdialog, or behind the hint
            button on normal steps.
          </span>
        )}
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
        Preview failed to load — check the image.
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
