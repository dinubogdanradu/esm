# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node lives under nvm and is not on the non-interactive PATH. Prefix commands:

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc -b --noEmit` across both project references |
| `npm run build` | Typecheck, then production build to `dist/` |

Single test file or single test:

```bash
npm test -- src/App.test.tsx
npm test -- -t "renders the app shell heading"
```

GitHub Pages project deploys need the repo path as the base, since `vite.config.ts`
reads it from the environment and defaults to `/`:

```bash
VITE_BASE=/<repo>/ npm run build && npm run deploy
```

## Project state

This is a rewrite in progress, not a finished app. Read [docs/PLAN.md](docs/PLAN.md)
before starting work — it holds the architecture decisions, their rationale, the
phase breakdown and the known constraints. Phases 0 (toolchain), 1 (data model and
form shell), 2 (step field UI) and 4 (PDF template, preview, download) are complete,
so the app works end to end. Remaining: skill autocomplete and cross-group moves
(Phase 3), and the Phase 5 polish pass.

The repo began as a fork of an Odin-Project-style CV builder. That codebase now
sits in `legacy/` as design reference only:

- Nothing in `src/` imports it, it is outside the `tsconfig.app.json` include and
  the Vitest include glob, and it does not typecheck or build.
- It gets deleted once Phase 2 renders the real field UI.
- Do not extend it or copy its patterns. It stores form data as a positional
  array where consumers hardcode indexes (`info[0].value`, `info[8]`), mutates
  state objects in place before `setState`, and generates its PDF by
  screenshotting the DOM with html2canvas — the three problems this rewrite
  exists to fix. Its CSS and markup are worth reading; its data flow is not.

`src/icons/` is retained from the old tree because the new app reuses the assets.
Icons in `legacy/` are loaded via `require()`, which Vite does not support, so any
icon carried across needs converting to an ESM import.

## Architecture

- **`src/schema/cv.ts`** — zod schemas are the single source of truth. Types come
  from `z.infer`, so validation, TypeScript types and form defaults all derive from
  one definition. Do not hand-write a parallel interface for CV data.
  `src/schema/defaults.ts` holds `defaultCv()` and the `blankX()` factories that
  `useFieldArray` appends.
- **Optional means empty string, never `undefined`.** Every text field is a
  `string`, so inputs stay controlled and rehydrated drafts cannot break them.
  Optional URLs and dates are modelled as `z.union([z.literal(''), ...])`.
- **`src/schema/skills.md` is the skill hierarchy,** parsed at module load by
  `skillCatalog.ts` (`?raw` import, no codegen). Edit that file to change the skills;
  nothing else needs touching. **A trailing `!` marks a leaf** — a concrete skill,
  which becomes an `option` of its parent rather than an entry of its own, so leaves
  never appear in `EXPERTISE_ENTRIES` and `findEntry('Programming > Java')` is
  undefined by design. Without the marker, a heading with sub-items is a category and
  one without is an *open* category whose skills the user names (that is what the
  `Other` headings are for). A category can hold both kinds; `items` keeps them in file
  order and `options` is index-aligned with `skills`. The step renders this as one
  recursive checkbox tree (`EntryNode`), each level indented under its parent and
  wrapped in a `div role="group" aria-label={name}` rather than a `fieldset`, since
  the checkbox already names the level. `expertise[i]` lines up with
  `EXPERTISE_ENTRIES[i]` — use `entryIndex(key)` to build form paths, never a local
  map index. Entry keys are `string`, validated by `refine` against the catalog rather
  than by the compiler, because literals cannot be inferred from a parsed file.
- **`selected` exists at every level of expertise** — on each entry and on each skill
  — and decides what reaches the CV. All entries and all leaf options always exist in
  form state, so anything counting or rendering them must filter on `selected` and
  must also confirm every ancestor is selected. `activeExpertise` in `src/pdf/model.ts`
  does exactly that; reuse it rather than re-deriving the rule.
- **Expertise validation lives on the array** (`expertiseSchema`), not per entry,
  because the rules depend on neighbours: a category is satisfied by a checked skill
  *or* a checked sub-category, and an entry with any unchecked ancestor must not be
  validated since its section is hidden. Requirements apply only to checked things; a
  field-level `required` would block the step over leftover data in something
  unchecked.
- **Never touch `editor.commands` in the rich text editor.** Tiptap nulls its command
  manager on destroy and that getter has no null check, unlike `chain()` and `can()`,
  so it throws "Cannot read properties of null (reading 'commands')" after a teardown —
  which StrictMode causes on every mount. Guard with `editor.isDestroyed` and go
  through `chain()`. `useEditor` also captures its options once, so handlers live in
  refs; otherwise an editor inside a `RepeatableSection` keeps writing to the index it
  was created with after a sibling is removed.
- **Rich text is stored in the flat model in `src/schema/richText.ts`,** never the
  editor's own format. `src/components/fields/richTextDoc.ts` converts to and from
  Tiptap at the field boundary, so the schema and both exporters see one stable shape.
  The editor enables only the marks and nodes that model can represent. `RichTextField`
  suspends on `RichTextEditor` to keep ProseMirror out of the initial bundle.
- **Tests must not name skill catalog entries.** `skills.md` is data the user edits;
  derive keys from `EXPERTISE_ENTRIES` (or use `ratedEntry`/`openEntry` from
  `src/test/expertise.ts`) and assert structural invariants, or every edit to that file
  breaks the suite.
- **Errors on an array or object rather than an input** need `messageAtPath` from
  `src/components/fieldErrors.ts`; `useController` never surfaces them.
  `RepeatableSection` does this for its own array, but a custom container must too.
- **`src/builder/steps.ts`** — `STEPS` is the single source of step order, titles,
  and validation scope. The progress nav, next/back and PDF section order all
  derive from it, so adding a section means adding an entry there. `validate` holds
  section-level paths because `trigger('personal')` validates the whole subtree.
- **Fields go through the primitives in `src/components/fields/`,** never a raw
  `input`. Each wraps `useController` and owns its label, error and aria wiring, so
  a bare input silently loses validation display and accessibility.
  `RepeatableSection` wraps `useFieldArray` for every list-shaped section and works
  nested (bullets in a role, skills in a group) — pass it the matching `blankX()`
  factory as `makeItem`.
- **Watching a sibling field needs a subcomponent.** `RepeatableSection` renders
  items through a callback, so hooks cannot be called there; see `ExperienceEntry`
  and `ExpertiseGroup` for the pattern.
- **Form state** — one `useForm` in `src/builder/CvBuilder.tsx` is the only store.
  Do not add a context or reducer holding the same data; the two will drift. The
  route is `/build/:stepId` under a single element, so form state survives step
  changes. The preview will subscribe through `useWatch` with a debounce, as
  autosave already does.
- **`src/storage/draft.ts`** — `normalizeDraft` rebuilds a complete `Cv` from
  arbitrary stored JSON rather than validating it. Drafts are half-filled by
  definition, so `cvSchema.safeParse` would reject nearly all of them. When you add
  a field to the schema, add it to the matching `toX` mapper too, or stored drafts
  will silently drop it. Bump `DRAFT_KEY` for a breaking shape change.
- **`src/pdf/`** — `@react-pdf/renderer` components serve as both the preview and
  the download, so the two cannot diverge. Note this is a different package from
  `react-pdf`, a viewer for existing PDFs, which was removed. The template uses
  react-pdf's own StyleSheet subset, not CSS Modules, and cannot flow content
  between columns.
  - **All `Cv` to view-model mapping belongs in the pure `src/pdf/model.ts`,** not
    inside components. That is what the tests cover. Fields collected as free text but
    rendered as bullets — `profile.summary` and `experience[].achievements` — both go
    through `bulletLines`, which splits on newlines and strips any bullet characters
    the user typed.
  - **The left column's page budget is tight, and fails abruptly.** The two columns are
    a flex row, which react-pdf cannot split, so overflowing page one by a point emits a
    *blank* continuation page (card background only) and a larger overflow moves the
    whole row, leaving page one with just the header. `rowDivider`'s margins and
    `section`'s `marginBottom` are load-bearing for this, not merely cosmetic. Verify
    with the "keeps a full CV to two pages, with neither of them empty" test rather than
    by eye — the behaviour is not monotonic in content length.
  - **Do not reintroduce absolute positioning.** The template it came from was
    absolutely positioned at fixed offsets, which clips user content of unknown
    length. Sections are flex stacks with `wrap` and `minPresenceAhead` so overflow
    paginates.
  - **Only registered font variants exist** (Roboto 400, 700, italic and bold
    italic, bundled in `src/pdf/fonts/`). react-pdf throws rather than substituting,
    so a style using an unregistered weight or `fontStyle` fails the entire render
    with "Could not resolve font for Roboto". Adding such a style means adding the
    matching file and entry in `fonts.ts`; the node-environment document tests catch
    this.
  - `BRAND_LOGO` in `CvDocument.tsx` is static branding, not CV data, and appears on
    every generated CV.
  - **A border on an `Image` never shows**: react-pdf strokes it before painting the
    image, which then covers it. Use a wrapping `View` with a background and padding —
    see `photoFrame`. Also note an undecodable image is skipped silently, so image
    fixtures need real PNG bytes or they prove nothing.
  - **Gradients need an SVG shading rect**, not `backgroundColor`, which is
    solid-only — see `PageBackground`. Give it `fixed` so it repeats on continuation
    pages. react-pdf reads gradient coords as `props.x2 || 1`, so never pass `0` for a
    coordinate you want to stay `0`; use a shared non-zero value instead.
  - **An absolutely positioned box needs both edges anchored** (`left` *and* `right`),
    or it collapses to a narrow width and wraps its text mid-word. Centring a `Text`
    inside a `View` needs `justifyContent: 'center'` on a row; `textAlign: 'center'`
    alone leaves it at the content-box edge.
  - `pdfLayout.test.tsx` reads text positions and filled paths back out of the
    rendered PDF via `pdfjs-dist`, so placement is checked against the real output.
    Prefer that over eyeballing when changing geometry. Two gotchas when reading paths:
    those coordinates have **y growing downward** (unlike the text positions in the
    same file), and react-pdf emits four corner curves whatever the radius — a square
    corner is the degenerate one that passes through the corner point. It cannot see
    SVG at all, so shape geometry is unit-tested instead — see `chevronPoints`. It also
    counts dashed strokes and checks font subsets, which is how "is this bold" and "is
    there a rule here" get verified rather than assumed.
  - **Borders draw inside the box** (border-box sizing), so `photoSize` is the outer
    diameter and a border shrinks the visible image rather than growing the circle.
- **`src/preview/`** — `usePdfBlobUrl` debounces rendering and revokes superseded
  blob URLs; `PdfPreview` is `lazy`-loaded and subscribes to form state itself so
  keystrokes do not re-render the shell. Keep react-pdf and pptxgenjs behind dynamic
  imports or they land in the initial bundle.
  - **`downloadPptx.tsx` is a second exporter** (pptxgenjs, 10 x 6.25in deck) that
    reads the same `src/pdf/model.ts` view model as the PDF. That shared model is what
    keeps the two consistent, so a change there must be checked against both. Build it
    with `buildPptx`, which is split out from `downloadPptx` so tests can render under
    node; only the profile photo needs browser APIs. `pptxgenjs` has no document
    language setting — `pptx.lang` and `theme.lang` do not exist.
  - `mmmdownloadPptx.tsx` is an unused earlier copy of that exporter and should be
    deleted rather than updated.

Routing uses `HashRouter` because GitHub Pages has no rewrite rules and a
path-based deep link would 404 on refresh. `AppRoutes` is split from `App` so tests
can mount the routes inside a `MemoryRouter`.

Everything outside `src/pdf/` uses CSS Modules (`*.module.css`) with tokens
defined on `:root` in `src/styles/global.css`.

## Toolchain gotchas

Both of these cost time to rediscover:

- **TypeScript 7 removed `baseUrl`.** Path aliases must be written with a leading
  `./` — `"@/*": ["./src/*"]`. The alias is declared twice by necessity: in
  `tsconfig.app.json` for the compiler and in `vite.config.ts` for the bundler.
- **Vitest 4 needs `defineConfig` from `vitest/config`,** not from `vite`, or the
  `test` key in `vite.config.ts` fails to typecheck.

`tsconfig.json` is a solution file holding only references; real settings live in
`tsconfig.app.json` (for `src`) and `tsconfig.node.json` (for `vite.config.ts`).
`strict` and `noUncheckedIndexedAccess` are both on.

Test config lives in the `test` key of `vite.config.ts`. `globals: true` is set,
so `test`/`expect` need no import; jest-dom matchers and per-test cleanup come
from `src/test/setup.ts`.

Document-rendering tests (`CvDocument`, `downloadPptx`) run under
`// @vitest-environment node` with `/// <reference types="node" />`, since
`tsconfig.app.json` deliberately excludes node types from app code. Build expertise
fixtures with the helpers in `src/test/expertise.ts` — `selectSkill` ticks one of a
category's catalog leaves, `selectEntry` sets the skills of an open category. Both
validate the key against the catalog, and a nested category needs its ancestors
selected too.

Keep `@types/react` and `@types/react-dom` on the same major as the React runtime.
npm will happily install types a major ahead, which produces type errors that look
like real bugs.
