import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  createMakeCodeURL,
  defaultMakeCodeProject,
  MakeCodeFrameDriver,
  type MakeCodeProject,
} from "@microbit/makecode-embed/vanilla";

const PROJECTS_STORAGE_KEY = "pxt-tutorial-author:projects";
const LEGACY_PROJECT_STORAGE_KEY = "pxt-tutorial-author:project";

export type TutorialPhase =
  | "idle"
  | "starting"
  | "running"
  | "completed"
  | "error";

export interface TutorialRunState {
  phase: TutorialPhase;
  /** Zero-based step index reported by MakeCode. */
  currentStep: number;
  totalSteps: number;
  error?: string;
}

export interface MakeCodeEditor {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  iframeSrc: string;
  ready: boolean;
  requestLatestFiles: () => Promise<Record<string, string>>;
  /** State of the in-editor tutorial test run. */
  tutorial: TutorialRunState;
  /** Runs the given tutorial Markdown inside the embedded editor. */
  importTutorial: (markdown: string) => Promise<boolean>;
  /** Leaves test-run mode and re-opens the authoring project. */
  exitTutorial: () => Promise<void>;
}

const IDLE_TUTORIAL: TutorialRunState = {
  phase: "idle",
  currentStep: 0,
  totalSteps: 0,
};

function isTutorialProject(project: MakeCodeProject): boolean {
  return Boolean(project.header?.tutorial);
}

function projectKey(project: MakeCodeProject): string {
  return project.header?.id ?? "default";
}

/**
 * Loads projects saved by this app. Falls back to the pre-multi-project
 * storage format (`pxt-tutorial-author:project` holding a single project).
 */
function loadSavedProjects(): MakeCodeProject[] {
  try {
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { projects?: unknown };
      if (Array.isArray(parsed.projects)) {
        return parsed.projects.filter(
          (project): project is MakeCodeProject =>
            typeof project === "object" &&
            project !== null &&
            typeof (project as MakeCodeProject).text === "object",
        );
      }
    }
  } catch {
    // Fall through to the legacy key.
  }

  try {
    const legacy = window.localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as MakeCodeProject;
      if (parsed?.text) return [parsed];
    }
  } catch {
    // No saved project.
  }

  return [];
}

function saveProjects(projects: MakeCodeProject[]): void {
  try {
    window.localStorage.setItem(
      PROJECTS_STORAGE_KEY,
      JSON.stringify({ version: 1, projects }),
    );
  } catch {
    // Storage may be unavailable (private mode / quota); the editor still works.
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out.`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "MakeCode could not start this tutorial.";
}

/**
 * Embeds the real micro:bit MakeCode editor and exposes the latest saved
 * project files. The editor is embedded in "controller" mode, so this page
 * owns project persistence (`initialProjects` / `onWorkspaceSave`).
 *
 * Test runs are started with `importTutorial`, which turns the generated
 * Markdown into a live tutorial without publishing it anywhere.
 */
export function useMakeCodeEditor(): MakeCodeEditor {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const driverRef = useRef<MakeCodeFrameDriver | null>(null);

  const [initialProjects] = useState<MakeCodeProject[]>(loadSavedProjects);
  const projectsRef = useRef<Map<string, MakeCodeProject>>(
    new Map(initialProjects.map((project) => [projectKey(project), project])),
  );
  const authoringRef = useRef<MakeCodeProject | undefined>(
    initialProjects.find((project) => !isTutorialProject(project)),
  );
  const latestRef = useRef<MakeCodeProject | undefined>(authoringRef.current);
  const pendingSaves = useRef<((project?: MakeCodeProject) => void)[]>([]);
  const [ready, setReady] = useState(false);
  const [tutorial, setTutorial] = useState<TutorialRunState>(IDLE_TUTORIAL);

  const iframeSrc = useMemo(
    () =>
      createMakeCodeURL(
        "https://makecode.microbit.org",
        undefined, // latest version
        undefined, // default language
        1, // controller mode: the host manages projects
        undefined,
      ),
    [],
  );

  const restoreAuthoringProject = useCallback(async () => {
    const driver = driverRef.current;
    const project = authoringRef.current ?? latestRef.current;
    if (!driver || !project) return;

    try {
      if (project.header?.id) {
        await withTimeout(
          driver.openHeader(project.header.id),
          5000,
          "Restoring your project",
        );
      } else {
        await withTimeout(
          driver.importProject({ project }),
          5000,
          "Restoring your project",
        );
      }
    } catch {
      // The project is still in the host store; reloading the page recovers it.
    }
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const driver = new MakeCodeFrameDriver(
      {
        controllerId: "pxt-tutorial-author",
        initialProjects: async () => {
          const projects = Array.from(projectsRef.current.values());
          return projects.length > 0 ? projects : [defaultMakeCodeProject];
        },
        onEditorContentLoaded: () => setReady(true),
        onWorkspaceSave: (event) => {
          const project = event.project;
          if (!project) return;

          // Test-run projects are temporary: never persist them as the
          // authoring project.
          if (!isTutorialProject(project)) {
            latestRef.current = project;
            authoringRef.current = project;
            if (project.header?.id) {
              projectsRef.current.set(project.header.id, project);
              saveProjects(Array.from(projectsRef.current.values()));
            }
          }

          const resolvers = pendingSaves.current;
          pendingSaves.current = [];
          resolvers.forEach((resolve) => resolve(project));
        },
        onTutorialEvent: (event) => {
          switch (event.tutorialEvent) {
            case "loaded":
              setTutorial((current) =>
                current.phase === "error"
                  ? current
                  : { ...current, phase: "running" },
              );
              break;
            case "progress":
              setTutorial((current) => ({
                phase: event.isCompleted
                  ? "completed"
                  : current.phase === "starting"
                    ? "running"
                    : current.phase,
                currentStep: event.currentStep,
                totalSteps: event.totalSteps,
              }));
              break;
            case "completed":
              setTutorial((current) => ({ ...current, phase: "completed" }));
              break;
            case "exit":
              setTutorial(IDLE_TUTORIAL);
              // The learner exited the tutorial inside MakeCode; bring the
              // authoring project back.
              void restoreAuthoringProject();
              break;
          }
        },
      },
      () => iframeRef.current ?? undefined,
    );

    driverRef.current = driver;
    driver.initialize();

    return () => {
      driver.dispose();
      driverRef.current = null;
    };
  }, [restoreAuthoringProject]);

  /**
   * Asks the editor to save, then resolves with the freshest authoring project
   * (falls back to the last known snapshot after a short timeout).
   */
  const requestLatestProject = useCallback(
    async (timeoutMs = 1500): Promise<MakeCodeProject | undefined> => {
      const driver = driverRef.current;
      if (!driver) return latestRef.current;

      const project = await new Promise<MakeCodeProject | undefined>(
        (resolve) => {
          let settled = false;
          const finish = (result?: MakeCodeProject) => {
            if (settled) return;
            settled = true;
            resolve(
              result && !isTutorialProject(result)
                ? result
                : (latestRef.current ?? authoringRef.current),
            );
          };

          pendingSaves.current.push(finish);
          driver.saveProject().catch(() => finish(latestRef.current));
          window.setTimeout(() => finish(latestRef.current), timeoutMs);
        },
      );

      return project;
    },
    [],
  );

  const requestLatestFiles = useCallback(async (): Promise<
    Record<string, string>
  > => {
    const project = await requestLatestProject();
    return project?.text ?? {};
  }, [requestLatestProject]);

  const importTutorial = useCallback(
    async (markdown: string): Promise<boolean> => {
      const driver = driverRef.current;
      if (!driver) {
        setTutorial({
          ...IDLE_TUTORIAL,
          phase: "error",
          error: "The MakeCode editor is not ready yet.",
        });
        return false;
      }

      setTutorial({ ...IDLE_TUTORIAL, phase: "starting" });

      try {
        // Make sure the authoring project (and its header id) is saved before
        // the tutorial replaces the workspace.
        await requestLatestProject(1500);
        await withTimeout(
          driver.importTutorial({ markdown }),
          10000,
          "Starting the tutorial",
        );
        setTutorial((current) =>
          current.phase === "starting"
            ? { ...current, phase: "running" }
            : current,
        );
        return true;
      } catch (error) {
        setTutorial({
          ...IDLE_TUTORIAL,
          phase: "error",
          error: errorMessage(error),
        });
        return false;
      }
    },
    [requestLatestProject],
  );

  const exitTutorial = useCallback(async () => {
    await restoreAuthoringProject();
    setTutorial(IDLE_TUTORIAL);
  }, [restoreAuthoringProject]);

  return {
    iframeRef,
    iframeSrc,
    ready,
    requestLatestFiles,
    tutorial,
    importTutorial,
    exitTutorial,
  };
}
