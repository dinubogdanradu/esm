# Implementation Plan

## Goal

A React SPA that collects CV data through a multi-step form and renders it as a
downloadable PDF from a custom template, with a live preview beside the form.

Three gaps relative to the starting point: the form is single-page with the wrong
field list, skills are a flat list of strings, and there is no real PDF template.

## Starting point

The repo begins as a fork of an Odin-Project-style CV builder
(`gianlucajahn/CV-Application`). It already has a form, a live preview and a PDF
download, but all three rest on foundations that do not extend:

- **Positional data model.** `info` is an array of `{name, value, id}` and every
  consumer hardcodes indexes (`info[0].value` in `personalForm.js`, `info[8]`
  through `info[12]` in `EducationalPreview.js`). Changing the field list means
  editing every form and preview component.
- **In-place mutation.** `handleWorkChange` and `handleInfoChange` assign onto the
  existing state objects before calling `setState`. It renders correctly only
  because of how the tree is currently shaped.
- **The PDF is a screenshot.** `printDocument` runs html2canvas over the preview
  div and puts one PNG into a jsPDF page. There is no text layer, so the output
  is unselectable and unparseable by applicant tracking systems, and there is no
  pagination — content past one page height is scaled away. The hardcoded caps of
  3 jobs and 9 skills in `practicalForm.js` exist to hide this.
- **Cruft.** `react-pdf` and `react-responsive` are installed but never imported;
  `form.js` pulls a jest-dom matcher into the app bundle.
- Experience descriptions are one textarea blob rather than structured bullets.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| PDF engine | `@react-pdf/renderer` | Template defined once; real vector text, automatic multi-page flow, page-break control. The preview renders the same document, so preview and PDF cannot drift. Costs a flexbox/StyleSheet subset instead of CSS modules, and needs debouncing. |
| Scope | Rewrite the app layer; migrate to Vite + TypeScript | The positional model and raster PDF are both dead ends, so extending is not cheaper than replacing. A nested CV model with several repeatable arrays is where types pay off, and zod can generate them. |
| Skills | Categories, each holding skills with an optional level | Grouped sections are the standard engineering-CV layout and keep a long skill list readable. |
| Form infrastructure | react-hook-form + zod | Per-step schemas gate navigation; `useFieldArray` covers every repeatable section. |
| Persistence | Debounced localStorage autosave | A refresh should not wipe a half-filled CV. |

Note: `@react-pdf/renderer` is a different package from the `react-pdf` currently
in `package.json`, which is a viewer for existing PDFs and gets removed.

## Phase 0: toolchain (done)

Vite + TS was scaffolded fresh rather than migrating code that is about to be
replaced. The old tree moved to `legacy/` (not left in `src/` as originally
planned, so that `App.js` and the new `App.tsx` cannot collide during module
resolution) and stays there as CSS and markup reference until Phase 1 renders the
real shell, then gets deleted.

- `src/` now holds only the new app: `main.tsx`, `App.tsx`, `styles/global.css`,
  `test/setup.ts`, and the reused `icons/`.
- Removed `react-scripts`, `react-pdf`, `react-responsive`, `uniqid`,
  `html2canvas`, `jspdf`, `web-vitals`. React upgraded from 18.1 to 19.2 so the
  rewrite does not start a major behind; every library in the later phases
  supports it. Keep `@types/react` and `@types/react-dom` on the same major as
  the runtime — mismatched majors produce spurious type errors.
- `index.html` sits at the repo root and points at `/src/main.tsx`.
- Split tsconfig (`tsconfig.app.json` for `src`, `tsconfig.node.json` for
  `vite.config.ts`) driven by `tsc -b`, `strict` plus `noUncheckedIndexedAccess`,
  and an `@/` alias for `src`.
- Vitest with jsdom, `globals: true`, and `@testing-library/jest-dom/vitest` in
  `src/test/setup.ts`.
- CRA's `homepage` field is gone. GitHub Pages project deploys need
  `VITE_BASE=/<repo>/ npm run build`; the default is `/`.

Two version notes for anyone touching config here: TypeScript 7 has removed
`baseUrl`, so path aliases must be written as `"@/*": ["./src/*"]` with the
leading `./`; and Vitest 4 requires `defineConfig` imported from `vitest/config`
rather than `vite`, or the `test` key fails to typecheck.

Verified: `npm run typecheck`, `npm test` (2 passed), `npm run build`, and
`npm run dev` serving on :5173.

### Still open from Phase 0

- `require("../../icons/x.png")` calls still exist throughout `legacy/`. They are
  inert because nothing imports that tree, but any icon reused in the new app
  needs converting to an ESM import — Vite has no `require`.

## Phase 1: data model and form shell

`src/schema/cv.ts` holds the zod schemas; types come from `z.infer`, making the
schema the single source of truth for validation, types and defaults. Every
repeatable item carries a stable `id`.

A single `useForm` at the builder root is the store — no parallel context store to
drift out of sync. The preview subscribes through `useWatch` with a ~300ms
debounce. Persistence writes debounced to localStorage and rehydrates through
`safeParse`, so a stale shape is discarded rather than crashing the app.

Steps are a data array (`{ id, title, fieldPaths, Component }`), so the progress
indicator, next/back and validation all derive from one place; `Next` calls
`trigger(fieldPaths)` for the current step. Steps live on react-router URLs
(`/build/:step`) so the back button and deep links behave.

Repeatable sections use `useFieldArray`. Nested arrays — achievement bullets
inside a job — need a subcomponent per item scoped to the parent path. Reordering
ships as up/down buttons; dnd-kit is a follow-on rather than a v1 blocker.

## Phase 2: step forms

One component and one schema slice per step.

**Pending: the section and field list.** Each field needs its step, input type
(text, textarea, date, repeatable, tag list) and whether it is required.

## Phase 3: skills manager

```ts
skillGroups: [{
  id: string
  name: string
  showLevel: boolean
  skills: [{ id: string, name: string, level?: 1 | 2 | 3 | 4 | 5 }]
}]
```

User-defined groups, reorderable, with the existing `exampleSkills` util grown
into a typed per-category catalog for autocomplete. `showLevel` lets one group
render as plain tags and another as rated.

Open question for the template: proficiency as dots or bars looks better but is
not machine-readable, whereas a text label ("Advanced") parses. To be decided
alongside the template design.

## Phase 4: PDF template

`src/pdf/` with `CvDocument.tsx`, a `theme.ts` of tokens (color, spacing scale,
type scale) and one component per section.

- **Fonts.** react-pdf ships only Helvetica. Register a real family with every
  weight used, plus `Font.registerHyphenationCallback(w => [w])` to disable its
  aggressive hyphenation.
- **Pagination.** `wrap` on sections, `minPresenceAhead` on headings so none
  orphans at a page bottom, and a `render`-prop footer for page numbers.
- **Preview.** `usePDF` into a blob URL in an iframe. Keep the previous blob
  mounted while the next renders to avoid flicker and revoke stale object URLs.
  Download reuses that blob instead of rendering twice.
- **Bundle.** react-pdf is heavy, so the pdf module is dynamically imported and
  the form paints without it.

Layout constraint: react-pdf cannot flow content between columns, so a sidebar
layout only works when the sidebar always fits one page. A single-column layout
avoids that and parses better in ATS; current lean is single-column with a
compact contact header, to be confirmed at design time.

## Phase 5: polish

Autofill fixture rewritten to the new shape, validation messaging, empty-section
suppression so unfilled sections leave no stray headings in the PDF, and an
accessibility pass over the step navigation.

## Possible follow-ons

- dnd-kit drag reordering
- Multiple template variants
- JSON import and export of CV data

Each phase ends with a running app.
