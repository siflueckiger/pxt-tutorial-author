import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractWorkspaceCode, tutorialToMarkdown } from "./model/markdown";
import { loadDocFromStorage, saveDocToStorage } from "./model/storage";
import {
  createEmptyDoc,
  newStepId,
  type TutorialDoc,
  type TutorialStep,
} from "./model/types";
import { useMakeCodeEditor } from "./pxt/useMakeCodeEditor";
import { StepList } from "./components/StepList";
import { StepEditor } from "./components/StepEditor";
import { ExportPanel } from "./components/ExportPanel";

export default function App() {
  const { iframeRef, iframeSrc, ready, requestLatestFiles } = useMakeCodeEditor();

  const [doc, setDoc] = useState<TutorialDoc>(
    () => loadDocFromStorage() ?? createEmptyDoc(),
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => doc.steps[0]?.id,
  );
  const [status, setStatus] = useState("Loading editor…");
  const [busy, setBusy] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const readyRef = useRef(false);

  // Announce editor readiness without clobbering later capture messages.
  useEffect(() => {
    if (ready && !readyRef.current) {
      readyRef.current = true;
      setStatus("Editor ready");
    }
  }, [ready]);

  // Persist the tutorial document locally.
  useEffect(() => {
    const timer = window.setTimeout(() => saveDocToStorage(doc), 300);
    return () => window.clearTimeout(timer);
  }, [doc]);

  const selectedStep = useMemo(
    () => doc.steps.find((step) => step.id === selectedId),
    [doc.steps, selectedId],
  );

  const updateDoc = useCallback((updater: (current: TutorialDoc) => TutorialDoc) => {
    setDoc((current) => updater(current));
  }, []);

  const addStep = useCallback(async () => {
    setBusy(true);
    setStatus("Reading workspace…");
    try {
      const code = extractWorkspaceCode(await requestLatestFiles());
      const id = newStepId();
      updateDoc((current) => ({
        ...current,
        steps: [
          ...current.steps,
          {
            id,
            title: `Step ${current.steps.length + 1}`,
            description: "",
            code,
            kind: "blocks",
          },
        ],
      }));
      setSelectedId(id);
      setStatus(code ? "Captured current blocks" : "Added empty step (no blocks found)");
    } finally {
      setBusy(false);
    }
  }, [requestLatestFiles, updateDoc]);

  const insertAfter = useCallback(
    async (afterId: string) => {
      setBusy(true);
      setStatus("Reading workspace…");
      try {
        const code = extractWorkspaceCode(await requestLatestFiles());
        const id = newStepId();
        updateDoc((current) => {
          const index = current.steps.findIndex((step) => step.id === afterId);
          const steps = [...current.steps];
          steps.splice(index + 1, 0, {
            id,
            title: "New step",
            description: "",
            code,
            kind: "blocks",
          });
          return { ...current, steps };
        });
        setSelectedId(id);
        setStatus(code ? "Captured current blocks" : "Added empty step (no blocks found)");
      } finally {
        setBusy(false);
      }
    },
    [requestLatestFiles, updateDoc],
  );

  const moveStep = useCallback(
    (id: string, direction: -1 | 1) => {
      updateDoc((current) => {
        const index = current.steps.findIndex((step) => step.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.steps.length) {
          return current;
        }
        const steps = [...current.steps];
        [steps[index], steps[target]] = [steps[target], steps[index]];
        return { ...current, steps };
      });
    },
    [updateDoc],
  );

  const deleteStep = useCallback(
    (id: string) => {
      updateDoc((current) => ({
        ...current,
        steps: current.steps.filter((step) => step.id !== id),
      }));
      setSelectedId((current) => (current === id ? undefined : current));
    },
    [updateDoc],
  );

  const updateStep = useCallback(
    (id: string, patch: Partial<TutorialStep>) => {
      updateDoc((current) => ({
        ...current,
        steps: current.steps.map((step) =>
          step.id === id ? { ...step, ...patch } : step,
        ),
      }));
    },
    [updateDoc],
  );

  const captureIntoStep = useCallback(
    async (id: string) => {
      setBusy(true);
      setStatus("Reading workspace…");
      try {
        const code = extractWorkspaceCode(await requestLatestFiles());
        updateStep(id, { code });
        setStatus(code ? "Refreshed step from workspace" : "Workspace is empty");
      } finally {
        setBusy(false);
      }
    },
    [requestLatestFiles, updateStep],
  );

  const markdown = useMemo(() => tutorialToMarkdown(doc), [doc]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__left">
          <span className="topbar__brand">Tutorial Author</span>
          <span className="topbar__status">{status}</span>
        </div>
        <div className="topbar__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={addStep}
            disabled={busy || !ready}
          >
            + Add step
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setShowExport(true)}
          >
            Export Markdown
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="editorPane">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="MakeCode editor"
            allow="usb; autoplay; camera; microphone;"
          />
          {!ready ? (
            <div className="editorPane__loading">Loading MakeCode…</div>
          ) : null}
        </div>

        <aside className="authorPane">
          <div className="authorPane__head">
            <label className="field">
              <span className="field__label">Tutorial title</span>
              <input
                className="input"
                value={doc.title}
                placeholder="e.g. Flashing heart"
                onChange={(e) =>
                  updateDoc((current) => ({ ...current, title: e.target.value }))
                }
              />
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={doc.explicitHints}
                onChange={(e) =>
                  updateDoc((current) => ({
                    ...current,
                    explicitHints: e.target.checked,
                  }))
                }
              />
              <span>Show hints by default (@explicitHints)</span>
            </label>
          </div>

          <div className="authorPane__scroll">
            <StepList
              steps={doc.steps}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveStep}
              onDelete={deleteStep}
              onInsertAfter={insertAfter}
            />

            {selectedStep ? (
              <StepEditor
                step={selectedStep}
                onChange={(patch) => updateStep(selectedStep.id, patch)}
                onCapture={() => captureIntoStep(selectedStep.id)}
                busy={busy}
              />
            ) : (
              <div className="empty">
                {doc.steps.length === 0
                  ? "Build some blocks in the editor, then press “Add step”."
                  : "Select a step to edit it."}
              </div>
            )}
          </div>
        </aside>
      </div>

      {showExport ? (
        <ExportPanel markdown={markdown} onClose={() => setShowExport(false)} />
      ) : null}
    </div>
  );
}
