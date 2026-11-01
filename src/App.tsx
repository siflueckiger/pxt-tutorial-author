import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorExtensionClient } from "./pxt/extensionClient";
import { extractWorkspaceCode, tutorialToMarkdown } from "./model/markdown";
import { parseDoc, serializeDoc } from "./model/storage";
import {
  createDemoDoc,
  createEmptyDoc,
  newStepId,
  type TutorialDoc,
  type TutorialStep,
} from "./model/types";
import { StepList } from "./components/StepList";
import { StepEditor } from "./components/StepEditor";
import { ExportPanel } from "./components/ExportPanel";

const client = new EditorExtensionClient();

export default function App() {
  const [doc, setDoc] = useState<TutorialDoc>(createEmptyDoc);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [status, setStatus] = useState("Connecting…");
  const [busy, setBusy] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const hydratedRef = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);

  // Load the stored tutorial (or seed a demo when running outside MakeCode).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await client.whenReady();
        const resp = await client.readCode();
        if (cancelled) return;

        const loaded = parseDoc(resp.json);
        const initial =
          loaded ?? (client.isHosted ? createEmptyDoc() : createDemoDoc());

        setDoc(initial);
        setSelectedId(initial.steps[0]?.id);
        hydratedRef.current = true;
        setHydrated(true);
        setStatus(
          client.isHosted ? "Connected to MakeCode" : "Local preview mode",
        );
      } catch {
        if (cancelled) return;
        setDoc(createDemoDoc());
        hydratedRef.current = true;
        setHydrated(true);
        setStatus("Could not reach the editor");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist (debounced) into the extension's JSON sidecar.
  useEffect(() => {
    if (!hydratedRef.current) return;

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      client
        .writeCode({
          code: "// Tutorial Author data lives in the companion JSON file.\n",
          json: serializeDoc(doc),
        })
        .then(() => setStatus("Saved"))
        .catch(() => setStatus("Save failed"));
    }, 500);

    return () => window.clearTimeout(saveTimer.current);
  }, [doc]);

  // Re-read when the editor re-shows the panel.
  useEffect(() => {
    const handleShown = () => {
      client
        .readCode()
        .then((resp) => {
          const reloaded = parseDoc(resp.json);
          if (reloaded) setDoc(reloaded);
        })
        .catch(() => undefined);
    };
    client.on("shown", handleShown);
    return () => client.off("shown", handleShown);
  }, []);

  const selectedStep = useMemo(
    () => doc.steps.find((step) => step.id === selectedId),
    [doc.steps, selectedId],
  );

  const updateDoc = useCallback((updater: (current: TutorialDoc) => TutorialDoc) => {
    setDoc((current) => updater(current));
  }, []);

  const captureCurrentCode = useCallback(async (): Promise<string> => {
    const files = await client.readUserCode();
    return extractWorkspaceCode(files);
  }, []);

  const addStep = useCallback(async () => {
    setBusy(true);
    setStatus("Reading workspace…");
    try {
      const code = await captureCurrentCode();
      const step: TutorialStep = {
        id: newStepId(),
        title: `Step ${doc.steps.length + 1}`,
        description: "",
        code,
        kind: "blocks",
      };
      updateDoc((current) => ({ ...current, steps: [...current.steps, step] }));
      setSelectedId(step.id);
      setStatus(code ? "Captured current blocks" : "Added empty step (no blocks found)");
    } catch {
      setStatus("Could not read the workspace");
    } finally {
      setBusy(false);
    }
  }, [captureCurrentCode, doc.steps.length, updateDoc]);

  const insertAfter = useCallback(
    async (afterId: string) => {
      setBusy(true);
      setStatus("Reading workspace…");
      try {
        const code = await captureCurrentCode();
        const step: TutorialStep = {
          id: newStepId(),
          title: "New step",
          description: "",
          code,
          kind: "blocks",
        };
        updateDoc((current) => {
          const index = current.steps.findIndex((s) => s.id === afterId);
          const steps = [...current.steps];
          steps.splice(index + 1, 0, step);
          return { ...current, steps };
        });
        setSelectedId(step.id);
        setStatus(code ? "Captured current blocks" : "Added empty step (no blocks found)");
      } catch {
        setStatus("Could not read the workspace");
      } finally {
        setBusy(false);
      }
    },
    [captureCurrentCode, updateDoc],
  );

  const moveStep = useCallback(
    (id: string, direction: -1 | 1) => {
      updateDoc((current) => {
        const index = current.steps.findIndex((s) => s.id === id);
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
        steps: current.steps.filter((s) => s.id !== id),
      }));
      setSelectedId((current) => (current === id ? undefined : current));
    },
    [updateDoc],
  );

  const updateStep = useCallback(
    (id: string, patch: Partial<TutorialStep>) => {
      updateDoc((current) => ({
        ...current,
        steps: current.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));
    },
    [updateDoc],
  );

  const captureIntoStep = useCallback(
    async (id: string) => {
      setBusy(true);
      setStatus("Reading workspace…");
      try {
        const code = await captureCurrentCode();
        updateStep(id, { code });
        setStatus(code ? "Refreshed step from workspace" : "Workspace is empty");
      } catch {
        setStatus("Could not read the workspace");
      } finally {
        setBusy(false);
      }
    },
    [captureCurrentCode, updateStep],
  );

  const markdown = useMemo(() => tutorialToMarkdown(doc), [doc]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__titleRow">
          <h1 className="app__title">Tutorial Author</h1>
          <span className={"app__status" + (busy ? " app__status--busy" : "")}>
            {status}
          </span>
        </div>

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

        <div className="app__actions">
          <button
            className="btn btn--primary"
            onClick={addStep}
            disabled={busy || !hydrated}
          >
            + Add step
          </button>
          <button
            className="btn"
            onClick={() => setShowExport(true)}
            disabled={!hydrated}
          >
            Export Markdown
          </button>
        </div>
      </header>

      <main className="app__body">
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
      </main>

      {showExport ? (
        <ExportPanel
          markdown={markdown}
          onClose={() => setShowExport(false)}
        />
      ) : null}
    </div>
  );
}
