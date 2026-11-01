import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  createMakeCodeURL,
  defaultMakeCodeProject,
  MakeCodeFrameDriver,
  type MakeCodeProject,
} from "@microbit/makecode-embed/vanilla";

const PROJECT_STORAGE_KEY = "pxt-tutorial-author:project";

export interface MakeCodeEditor {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  iframeSrc: string;
  ready: boolean;
  requestLatestFiles: () => Promise<Record<string, string>>;
}

function loadSavedProject(): MakeCodeProject | undefined {
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as MakeCodeProject;
    return parsed?.text ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function saveProject(project: MakeCodeProject): void {
  try {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  } catch {
    // Storage may be unavailable (private mode / quota); the editor still works.
  }
}

/**
 * Embeds the real micro:bit MakeCode editor and exposes the latest saved
 * project files. The editor is embedded in "controller" mode, so this page
 * owns project persistence (`initialProjects` / `onWorkspaceSave`).
 */
export function useMakeCodeEditor(): MakeCodeEditor {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const driverRef = useRef<MakeCodeFrameDriver | null>(null);
  const latestRef = useRef<MakeCodeProject | undefined>(loadSavedProject());
  const pendingSaves = useRef<((project?: MakeCodeProject) => void)[]>([]);
  const [ready, setReady] = useState(false);

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

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const driver = new MakeCodeFrameDriver(
      {
        controllerId: "pxt-tutorial-author",
        initialProjects: async () => [loadSavedProject() ?? defaultMakeCodeProject],
        onEditorContentLoaded: () => setReady(true),
        onWorkspaceSave: (event) => {
          const project = event.project;
          if (!project) return;

          latestRef.current = project;
          saveProject(project);

          const resolvers = pendingSaves.current;
          pendingSaves.current = [];
          resolvers.forEach((resolve) => resolve(project));
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
  }, []);

  /**
   * Asks the editor to save, then resolves with the freshest project text
   * (falls back to the last known snapshot after a short timeout).
   */
  const requestLatestFiles = useCallback(
    async (timeoutMs = 1500): Promise<Record<string, string>> => {
      const driver = driverRef.current;
      if (!driver) return latestRef.current?.text ?? {};

      const project = await new Promise<MakeCodeProject | undefined>((resolve) => {
        let settled = false;
        const finish = (result?: MakeCodeProject) => {
          if (settled) return;
          settled = true;
          resolve(result ?? latestRef.current);
        };

        pendingSaves.current.push(finish);
        driver.saveProject().catch(() => finish(latestRef.current));
        window.setTimeout(() => finish(latestRef.current), timeoutMs);
      });

      return project?.text ?? {};
    },
    [],
  );

  return { iframeRef, iframeSrc, ready, requestLatestFiles };
}
