import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkTutorial } from "./model/checks";
import { extractWorkspaceCode, tutorialToMarkdown } from "./model/markdown";
import { loadDocFromStorage, saveDocToStorage } from "./model/storage";
import {
  createEmptyDoc,
  createStep,
  type TutorialDoc,
  type TutorialMeta,
  type TutorialStep,
} from "./model/types";
import { useMakeCodeEditor } from "./pxt/useMakeCodeEditor";
import { StepList } from "./components/StepList";
import { StepEditor } from "./components/StepEditor";
import { ExportPanel } from "./components/ExportPanel";
import { TutorialSettings } from "./components/TutorialSettings";
import { ChecksPanel } from "./components/ChecksPanel";

export default function App() {
  const {
    iframeRef,
    iframeSrc,
    ready,
    requestLatestFiles,
    tutorial,
    importTutorial,
    exitTutorial,
  } = useMakeCodeEditor();

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
  const testing = tutorial.phase !== "idle";

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

  const issues = useMemo(() => checkTutorial(doc), [doc]);

  const updateDoc = useCallback((updater: (current: TutorialDoc) => TutorialDoc) => {
    setDoc((current) => updater(current));
  }, []);

  const updateMeta = useCallback(
    (patch: Partial<TutorialMeta>) => {
      updateDoc((current) => ({
        ...current,
        meta: { ...current.meta, ...patch },
      }));
    },
    [updateDoc],
  );

  const addStep = useCallback(async () => {
    setBusy(true);
    setStatus("Reading workspace…");
    try {
      const code = extractWorkspaceCode(await requestLatestFiles());
      const step = createStep({
        title: `Step ${doc.steps.length + 1}`,
        code,
      });
      updateDoc((current) => ({
        ...current,
        steps: [...current.steps, step],
      }));
      setSelectedId(step.id);
      setStatus(code ? "Captured current blocks" : "Added empty step (no blocks found)");
    } finally {
      setBusy(false);
    }
  }, [doc.steps.length, requestLatestFiles, updateDoc]);

  const insertAfter = useCallback(
    async (afterId: string) => {
      setBusy(true);
      setStatus("Reading workspace…");
      try {
        const code = extractWorkspaceCode(await requestLatestFiles());
        const step = createStep({ title: "New step", code });
        updateDoc((current) => {
          const index = current.steps.findIndex((item) => item.id === afterId);
          const steps = [...current.steps];
          steps.splice(index + 1, 0, step);
          return { ...current, steps };
        });
        setSelectedId(step.id);
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

  const startTestRun = useCallback(async () => {
    setShowExport(false);
    setStatus("Starting test run…");
    const started = await importTutorial(markdown);
    setStatus(started ? "Test run started" : "Test run failed");
  }, [importTutorial, markdown]);

  const stopTestRun = useCallback(async () => {
    setStatus("Leaving test run…");
    await exitTutorial();
    setStatus("Back to authoring");
  }, [exitTutorial]);

  const tutorialStepLabel =
    tutorial.totalSteps > 0
      ? `step ${Math.min(tutorial.currentStep + 1, tutorial.totalSteps)}/${tutorial.totalSteps}`
      : "step 1";

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
            disabled={busy || !ready || testing}
          >
            + Add step
          </button>
          {testing ? (
            <button type="button" className="btn" onClick={stopTestRun}>
              Exit test
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={startTestRun}
              disabled={busy || !ready || doc.steps.length === 0}
              title={
                doc.steps.length === 0
                  ? "Add a step before running the tutorial"
                  : "Run the tutorial in the embedded editor"
              }
            >
              Test run
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => setShowExport(true)}
          >
            Export Markdown
          </button>
        </div>
      </header>

      {testing ? (
        <div className={`testBanner testBanner--${tutorial.phase}`}>
          <span className="testBanner__label">
            {tutorial.phase === "starting" ? "Starting test run…" : null}
            {tutorial.phase === "running" ? `Testing ${tutorialStepLabel}` : null}
            {tutorial.phase === "completed"
              ? "Test run complete — the learner reached the end."
              : null}
            {tutorial.phase === "error"
              ? `Test run failed: ${tutorial.error ?? "unknown error"}`
              : null}
          </span>
          <button type="button" className="btn btn--small" onClick={stopTestRun}>
            Back to authoring
          </button>
        </div>
      ) : null}

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
            <TutorialSettings
              doc={doc}
              onTitleChange={(title) =>
                updateDoc((current) => ({ ...current, title }))
              }
              onMetaChange={updateMeta}
            />
          </div>

          <div className="authorPane__scroll">
            <StepList
              steps={doc.steps}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveStep}
              onDelete={deleteStep}
              onInsertAfter={insertAfter}
              captureDisabled={testing}
            />

            {selectedStep ? (
              <StepEditor
                step={selectedStep}
                onChange={(patch) => updateStep(selectedStep.id, patch)}
                onCapture={() => captureIntoStep(selectedStep.id)}
                busy={busy}
                captureDisabled={testing}
              />
            ) : (
              <div className="empty">
                {doc.steps.length === 0
                  ? "Build some blocks in the editor, then press “Add step”."
                  : "Select a step to edit it."}
              </div>
            )}

            <ChecksPanel
              issues={issues}
              onSelectStep={(id) => setSelectedId(id)}
            />
          </div>
        </aside>
      </div>

      {showExport ? (
        <ExportPanel markdown={markdown} onClose={() => setShowExport(false)} />
      ) : null}
    </div>
  );
}
