import type { TutorialDoc, TutorialMeta } from "../model/types";

interface TutorialSettingsProps {
  doc: TutorialDoc;
  onTitleChange: (title: string) => void;
  onMetaChange: (patch: Partial<TutorialMeta>) => void;
}

const META_OPTIONS: {
  key: keyof TutorialMeta;
  label: string;
  hint: string;
}[] = [
  {
    key: "explicitHints",
    label: "Show hints by default",
    hint: "@explicitHints — display each step's hint without the learner asking.",
  },
  {
    key: "diffs",
    label: "Highlight code diffs",
    hint: "@diffs — highlight what changed between consecutive steps.",
  },
  {
    key: "hideIteration",
    label: "Hide step navigation",
    hint: "@hideIteration — hide the previous/next/exit controls and step counter.",
  },
  {
    key: "hideDone",
    label: "Hide final “Done” button",
    hint: "@hideDone — keep the learner in the tutorial at the last step.",
  },
  {
    key: "hideToolbox",
    label: "Hide toolbox",
    hint: "@hideToolbox — for text-based tutorials.",
  },
  {
    key: "unifiedToolbox",
    label: "Unified toolbox",
    hint: "@unifiedToolbox — keep all blocks in a permanent flyout.",
  },
];

export function TutorialSettings({
  doc,
  onTitleChange,
  onMetaChange,
}: TutorialSettingsProps) {
  return (
    <div className="settings">
      <label className="field">
        <span className="field__label">Tutorial title</span>
        <input
          className="input"
          value={doc.title}
          placeholder="e.g. Flashing heart"
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>

      <details className="settings__details">
        <summary className="settings__summary">
          Tutorial options
          <span className="settings__count">
            {Object.values(doc.meta).filter(Boolean).length} enabled
          </span>
        </summary>

        <div className="settings__grid">
          {META_OPTIONS.map((option) => (
            <label key={option.key} className="checkbox checkbox--block">
              <input
                type="checkbox"
                checked={doc.meta[option.key]}
                onChange={(event) =>
                  onMetaChange({ [option.key]: event.target.checked })
                }
              />
              <span>
                <span className="checkbox__label">{option.label}</span>
                <span className="checkbox__hint">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
