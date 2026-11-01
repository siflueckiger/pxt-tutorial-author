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
- Edit each step's **title**, **description**, and **block type**
  (`blocks`, `template`, or `ghost`).
- **Capture from workspace** to refresh a single step after changing blocks.
- **Export Markdown** — live preview, copy to clipboard, or download
  `tutorial.md`.
- Tutorial steps and the editor project persist in `localStorage`, so a reload
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
5. Press **Export Markdown**, then copy or download `tutorial.md`.
6. Commit the file to your tutorial repository (e.g. as `README.md` or
   `tutorial.md`).
7. Share it with:

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
- The exported Markdown is not written to any file automatically; use
  **Export** and commit it yourself.
- The editor project is stored in `localStorage` under this site's origin.
  Clearing site data resets the embedded project and tutorial.

## Project structure

```
index.html
src/
  pxt/useMakeCodeEditor.ts  embeds MakeCode, tracks saved project files
  model/types.ts            tutorial document model
  model/markdown.ts         workspace capture + Markdown generation
  model/storage.ts          localStorage serialize / parse
  components/               StepList, StepEditor, ExportPanel
  App.tsx                   two-pane UI (editor + authoring panel)
scripts/check-markdown.mts  logic checks for capture + Markdown output
```
