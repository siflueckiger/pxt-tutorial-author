# pxt-tutorial-author

Author [Microsoft MakeCode](https://makecode.microbit.org) tutorials by
**building blocks in the editor** and clicking **Add step**. Each step captures
the current workspace, plus a title and description, and the whole thing
exports to MakeCode tutorial Markdown that you commit to a GitHub repository.

The app embeds the **real micro:bit MakeCode editor** in an iframe using the
official [`@microbit/makecode-embed`](https://github.com/microbit-foundation/makecode-embed)
driver. The editor runs in "controller" mode, so this page receives the
project's files (`main.ts`, `main.blocks`, …) whenever the workspace is saved.

> **Why an embedded app instead of a MakeCode editor extension?**
> MakeCode only loads editor-extension iframes from *approved* repos whose URL
> is listed in the target's `targetconfig.json`
> (`packages.approvedEditorExtensionUrls`). The micro:bit target only allows
> `https://microsoft.github.io/ml4f/`, so a custom editor extension shows
> "Sorry, this extension is not allowed." The embedded-editor approach has no
> such approval gate.

## What it does

- **+ Add step** — reads the current workspace (`main.ts`, falling back to
  `main.blocks`) and appends a step with that code.
- **Insert / move / delete** steps in any order.
- **Edit each step's** title, description, image URL (absolute https),
  block type (`blocks`, `template` or `ghost`), modifier (`@showhint`,
  `@showdialog`), and accordion hints (`~hint … hint~`).
- **Tutorial options** — toggle MakeCode metadata (`@explicitHints`, `@diffs`,
  `@hideIteration`, `@hideDone`, `@hideToolbox`, `@unifiedToolbox`).
- **Test run** — runs the tutorial you just built inside the embedded MakeCode
  editor via the driver's `importTutorial`, so you can click through the real
  learner experience without publishing anything. A banner tracks progress
  (steps loaded, current step, completion) using MakeCode's `tutorialevent`s;
  **Back to authoring** restores your project.
- **Capture from workspace** to refresh a single step after changing blocks.
- **Checks** — lightweight authoring hints: long captions, identical
  consecutive steps, empty block steps, deprecated modifiers, template
  placement, and a scaffold-fade tip.
- **Step diffs** — every step shows how many lines it adds and removes
  compared with the previous step.
- **Export Markdown** — live preview, copy to clipboard, or download
  `tutorial.md`.
- Tutorial steps and editor projects persist in `localStorage`, so a reload
  keeps your work.

## Requirements

- Node.js 18+ and npm
- Internet access (the editor and simulator load from `makecode.microbit.org`)

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The left pane is the embedded MakeCode editor;
the right pane is the authoring panel.

## Build and deploy

```bash
npm run build     # type-check + production build into dist/
npm run deploy    # build and publish dist/ to the gh-pages branch
```

The site is deployed at <https://siflueckiger.github.io/pxt-tutorial-author/>.
GitHub Pages serves the `gh-pages` branch (with `.nojekyll`).

## Authoring workflow

1. Open the app and build the blocks for your first step in the editor.
2. In the right pane, press **+ Add step**, then fill in the title and
   description.
3. Change the blocks for the next step and press **+ Add step** again.
4. Reorder steps with the arrow buttons; use **＋** to insert a step and **×**
   to delete one.
5. Press **Test run** to click through the tutorial in the editor. When you are
   done, press **Back to authoring**.
6. Fix anything the **Checks** panel flags, then press **Export Markdown** and
   copy or download `tutorial.md`.
7. Commit the file to your tutorial repository (e.g. as `README.md` or
   `tutorial.md`).
8. Share it with:

   ```
   https://makecode.microbit.org/#tutorial:https://github.com/<user>/<repo>
   ```

## Block types

| Type       | Markdown fence          | Meaning                                                    |
| ---------- | ----------------------- | ---------------------------------------------------------- |
| `blocks`   | ```` ```blocks ````     | Hint / goal — the blocks the learner should build.         |
| `template` | ```` ```template ````   | Starting workspace — code pre-loaded before the learner.   |
| `ghost`    | ```` ```ghost ````      | Toolbox-only — shown but not required.                     |

## Notes and limitations

- **Snapshots are cumulative.** "Add step" captures the *entire* current
  workspace. That is usually what you want for a running tutorial, but you can
  trim a step's code manually in the panel.
- **Test runs are in-memory.** The generated Markdown is passed straight to the
  embedded editor, so there is no GitHub/gist publishing, no MakeCode cloud
  cache, and no auth required. Test-run projects are not saved as your
  authoring project.
- The exported Markdown is not written to any file automatically; use
  **Export** and commit it yourself.
- Editor projects and the tutorial document are stored in `localStorage`.
  Clearing site data resets them.
- `@fullscreen` and `@unplugged` are deprecated by MakeCode; use `@showhint`
  and `@showdialog`. The Checks panel warns if an old modifier is pasted into
  a step.
- **Images** are referenced by absolute https URL (e.g. a
  `raw.githubusercontent.com` link). Relative `/static/…` paths only work in
  official editor repositories, so the Checks panel warns about them. Images
  are shown by `@showhint` / `@showdialog` steps, or behind the hint button on
  normal steps.

## Project structure

```
index.html
src/
  pxt/useMakeCodeEditor.ts  embeds MakeCode, test runs, project persistence
  model/types.ts            tutorial document model + metadata options
  model/markdown.ts         workspace capture + Markdown generation
  model/checks.ts           lightweight authoring checks + step diffs
  model/storage.ts          localStorage serialize / parse (+ v1 migration)
  components/               StepList, StepEditor, TutorialSettings,
                            ChecksPanel, ExportPanel
  App.tsx                   two-pane UI (editor + authoring panel)
scripts/check-markdown.mts  logic checks for Markdown, diffs and checks
```
