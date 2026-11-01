# pxt-tutorial-author

Author [Microsoft MakeCode](https://makecode.microbit.org) tutorials by
**building blocks in the editor** and clicking **Add step**. Each step captures
the current workspace, plus a title and description, and the whole thing
exports to MakeCode tutorial Markdown that you commit to a GitHub repository.

This is a MakeCode **editor extension**: a small web app loaded inside the
editor in an iframe. It talks to the editor over the official `pxtpkgext`
message protocol.

## What it does

- **+ Add step** — reads the current workspace (`main.ts`, falling back to
  `main.blocks`) and appends a step with that code.
- **Insert / move / delete** steps in any order.
- Edit each step's **title**, **description**, and **block type**
  (`blocks`, `template`, or `ghost`).
- **Capture from workspace** to refresh a single step after changing blocks.
- **Export Markdown** — live preview, copy to clipboard, or download
  `tutorial.md`.
- Steps persist inside the project via the extension's JSON sidecar, so they
  survive reloads.

## Requirements

- Node.js 18+ and npm
- A GitHub account (for hosting the extension on GitHub Pages)

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Outside the MakeCode editor the panel runs in
**local preview mode** with a demo tutorial and stores data in `localStorage`,
so you can iterate on the UI without the editor.

To try it inside the editor locally, add `localeditorextensions=1` to the
editor URL and load the extension's `localUrl`
(`http://127.0.0.1:5173/`).

## Build and deploy

```bash
npm run build     # type-check + production build into dist/
npm run deploy    # build and publish dist/ to the gh-pages branch
```

After the first deploy, enable GitHub Pages for the repository with the
`gh-pages` branch as the source. The extension URL becomes:

```
https://<user>.github.io/pxt-tutorial-author/
```

`pxt.json` already points `extension.url` at
`https://siflueckiger.github.io/pxt-tutorial-author/`; update it if you fork
under a different account.

## Install in MakeCode

The extension is not on the approved list, so load it by its full repository
URL:

1. Open <https://makecode.microbit.org> and create or open a project.
2. Gear menu → **Extensions**.
3. Paste `https://github.com/siflueckiger/pxt-tutorial-author` into the search
   box and add it.
4. A **Tutorial Author** button appears in the toolbox. Click it to open the
   panel.

## Authoring workflow

1. Open a project and add the extension.
2. Build the blocks for your first step.
3. In the panel, press **+ Add step**, then fill in the title and description.
4. Change the blocks for the next step and press **+ Add step** again.
5. Reorder steps with the arrow buttons; use **＋** to insert a step and **×**
   to delete one.
6. Press **Export Markdown**, then copy or download `tutorial.md`.
7. Commit the file to your tutorial repository (e.g. as `README.md` or
   `tutorial.md`).
8. Share it with:

   ```
   https://makecode.microbit.org/#tutorial:https://github.com/<user>/<repo>
   ```

## Block types

| Type       | Markdown fence    | Meaning                                                        |
| ---------- | ----------------- | -------------------------------------------------------------- |
| `blocks`   | ```` ```blocks ````    | Hint / goal — the blocks the learner should build.        |
| `template` | ```` ```template ````  | Starting workspace — code pre-loaded before the learner.  |
| `ghost`    | ```` ```ghost ````     | Toolbox-only — shown but not required.                    |

## Notes and limitations

- **Snapshots are cumulative.** "Add step" captures the *entire* current
  workspace. That is usually what you want for a running tutorial, but you can
  trim a step's code manually in the editor panel.
- **Only the extension's own sidecar files are writable.** The panel cannot
  write `tutorial.md` directly into the project; use **Export** and commit the
  file yourself.
- The `code` sidecar is a placeholder comment; the tutorial data lives in the
  companion JSON file.

## Project structure

```
pxt.json                  MakeCode extension manifest
main.ts                   empty runtime namespace (no blocks)
src/
  pxt/extensionClient.ts  pxtpkgext postMessage client (+ localStorage fallback)
  model/types.ts          tutorial document model
  model/markdown.ts       workspace capture + Markdown generation
  model/storage.ts        sidecar JSON serialize / parse
  components/             StepList, StepEditor, ExportPanel
  App.tsx                 main panel UI
```
