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

## Phase 1: data model and form shell (done)

Built as described below, with these implementation decisions:

- **Optional fields are empty strings, not `undefined`.** Every text input stays
  controlled and no rehydrated draft can put `undefined` into one. The `?` markers
  in the Phase 2 type sketch mean "may be empty", not "may be absent".
- **Skill `level` is required with a default of 3** rather than optional. The
  group's `showLevel` flag already encodes "not rated", so an optional numeric
  field would have been a second way to say the same thing.
- **HashRouter, not BrowserRouter.** GitHub Pages has no rewrite rules, so a
  path-based deep link such as `/build/projects` would 404 on refresh.
- **Draft rehydration normalizes rather than validates.** A draft is half-filled by
  definition, so `cvSchema.safeParse` would reject almost every one. `normalizeDraft`
  rebuilds a complete `Cv` over the defaults: missing keys get defaults, wrong types
  are replaced, unknown keys are dropped. The `DRAFT_KEY` version suffix discards
  drafts wholesale when a shape change makes them unreadable.
- **Deep links are treated as already-reached steps,** so a returning user can land
  on a later step. Step gating is UX, not a trust boundary.
- Steps are placeholders listing the fields they will own; Phase 2 swaps the
  `Component` on each entry in `STEPS` and changes nothing else.

Verified: `npm run typecheck`, `npm test` (33 passed), `npm run build`, dev server
transforming without errors. Test coverage is on the parts worth protecting —
schema rules (required fields, the `current`/`endDate` refinement, `YYYY-MM`
dates), draft normalization against junk input, and the shell's routing,
validation gating and autosave wiring.

### Original specification

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

One component and one zod schema slice per step. Nine steps: the eight CV sections
in the order below, then review and download. Sections render in the PDF in this
same order, and an empty section is omitted entirely rather than printing a bare
heading.

```ts
type Cv = {
  personal: {
    firstName: string          // required
    lastName: string           // required
    headline: string           // required, e.g. "Senior Software Engineer"
    location?: string
    email: string              // required
    phone?: string
    website?: string
    linkedin?: string
    photo?: string             // data URL, optional
  }

  profile: {
    summary: string            // required, textarea
  }

  // Qualifications: formal education
  qualifications: Array<{
    id: string
    institution: string        // required
    degree: string             // required
    field?: string
    location?: string
    startDate?: MonthYear
    endDate?: MonthYear
    grade?: string
  }>

  // Areas of expertise: the grouped skill model
  expertise: Array<{
    id: string
    name: string               // required, e.g. "Cloud & Infrastructure"
    showLevel: boolean
    skills: Array<{ id: string, name: string, level?: 1 | 2 | 3 | 4 | 5 }>
  }>

  // Experience summary: full entries with achievement bullets
  experience: Array<{
    id: string
    company: string            // required
    position: string           // required
    location?: string
    startDate: MonthYear       // required
    endDate?: MonthYear        // omitted when current is true
    current: boolean
    bullets: Array<{ id: string, text: string }>   // at least one
    tech: string[]             // tag input
  }>

  certifications: Array<{
    id: string
    name: string               // required
    issuer?: string
    date?: MonthYear
    expiryDate?: MonthYear
    credentialUrl?: string
  }>

  // One section, two shapes: languages carry a level, soft skills do not
  languages: Array<{
    id: string
    name: string               // required
    level: 'Native' | 'Fluent' | 'Professional' | 'Conversational' | 'Basic'
  }>
  softSkills: Array<{ id: string, name: string }>   // plain tag list

  projects: Array<{
    id: string
    name: string               // required
    role?: string
    description?: string
    tech: string[]
    url?: string
    startDate?: MonthYear
    endDate?: MonthYear
  }>
}
```

Assumptions worth overriding if wrong:

- `MonthYear` is a `YYYY-MM` string from a month picker rather than free text, so
  entries can be sorted newest-first automatically and formatted for the PDF in one
  place. Experience uses a `current` boolean instead of typing "Present".
- The `personal` field set above is a proposal, not something that was specified.
  Fields here are cheap to add later.
- Proficiency levels on expertise skills are numeric in the model; how they render
  (dots, a text label, or not at all) is a template decision in Phase 4.

## Phase 3: skills manager

The UI for the `expertise` array defined above — user-defined groups, reorderable,
with the `exampleSkills` util from `legacy/utils/` grown into a typed per-category
catalog for autocomplete. `showLevel` lets one group render as plain tags and
another as rated.

The soft skills tag input in the Languages & Soft Skills step is deliberately not
part of this: it is a flat list of names with no levels and no grouping.

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
