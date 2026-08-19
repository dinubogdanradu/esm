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
- Experience descriptions are one textarea blob rendered as a blob. (Achievements are
  free text again today, but the template splits them into bullets — the objection was
  always to unstructured *output*, not to a textarea as input.)

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

## Phase 2: step forms (done)

Every step is now editable. Field primitives live in `src/components/fields/`
(`TextField`, `TextAreaField`, `SelectField`, `CheckboxField`, `TagsField`,
`PhotoField`), each built on `useController` so its own error and aria wiring come
from one place. `src/components/RepeatableSection.tsx` wraps `useFieldArray` and
supplies add, remove and move controls for every list-shaped section, including the
nested cases (bullets inside a role, skills inside an expertise group).

Decisions made while building it:

- **Reordering is up/down buttons, not drag and drop,** as planned. They are
  keyboard accessible for free, which a dnd-kit implementation would have to add
  deliberately.
- **`type="month"` inputs.** Chromium shows a real month picker; Firefox and Safari
  fall back to a plain text box where the user types `YYYY-MM`, which the schema
  regex then validates. The error message says "Use the month picker", which is
  worth rewording if non-Chromium turns out to matter.
- **Photos are downscaled to 512px on the longest edge** before entering form
  state (`src/utils/image.ts`). Drafts autosave into localStorage, and a
  full-resolution photo would exhaust that quota by itself. The canvas path falls
  back to the original data URL when unavailable, and is not covered by tests
  because jsdom does not implement canvas encoding.
- **Ticking "I currently work here" clears and disables the end date,** so the
  schema refinement and the UI cannot disagree.
- **The review step summarises counts and flags missing required fields.** The
  download button is deliberately absent rather than present-and-disabled, since
  Phase 4 owns it.

Verified: `npm run typecheck`, `npm test` (48 passed), `npm run build`, dev server
transforming without errors. Tests drive real keyboard input through the field
primitives, so the gating cases no longer need to seed localStorage.

### Original specification

Nine steps: the eight CV sections in the order below, then review and download.
Sections render in the PDF in this same order, and an empty section is omitted
entirely rather than printing a bare heading.

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

  // Areas of expertise: one entry per container in the catalog read from
  // src/schema/skills.md. Every container is always present in form state;
  // `selected` decides whether it reaches the CV, and checking one reveals its
  // fieldset.
  expertise: Array<{
    key: string                    // container path, e.g. "Programming > Node.js"
    selected: boolean
    skills: Array<{
      id: string
      name: string                 // typed in an open container, fixed otherwise
      selected: boolean            // whether this skill reaches the CV
      level: 1 | 2 | 3 | 4 | 5     // always asked
      experienceMonths: number     // single total, 0-720 (sixty years)
      lastUsed: '' | 'Within last month' | 'Within last year'
              | 'More than a year ago'   // required when checked
      certificationLinks: Array<{ id: string, url: string }>
    }>
  }>

  // Experience summary: full entries, achievements as free text
  experience: Array<{
    id: string
    company: string            // required
    position: string           // required
    location?: string
    startDate: MonthYear       // required
    endDate?: MonthYear        // omitted when current is true
    current: boolean
    achievements: string      // required; one per line, rendered as bullets
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

## Expertise revision

The expertise section was reshaped after Phase 4 landed. Each skill carries
proficiency (always asked, `showLevel` is gone), experience as years plus a month
remainder, a last-used dropdown, and any number of certification links. Groups are
no longer free text; they come from a catalog rendered as checkboxes, and checking
one reveals its fieldset.

### The catalog comes from skills.md

`src/schema/skillCatalog.ts` parses `src/schema/skills.md` at module load, via a
`?raw` import, so that file is the single source of truth and needs no codegen step.
Level 1 is a group, level 2 a technology, level 3 a framework.

**A trailing `!` marks a leaf,** which is what separates a skill from a category.
Depth alone does not decide it, so the hierarchy can be as deep as the file needs:

- **`## Java !`** — a leaf: a concrete skill named by the heading. It is *not* an
  entry of its own; it becomes an `option` of its parent, because a skill is
  something you tick rather than something you nest under. Any children under a
  marked node are ignored.
- **`## Node.js`** with sub-items — a category: checking it reveals its children.
- **`## Other`** with no sub-items and no marker — an open category: the user names
  its own skills in a repeatable list. This is what the `Other` entries are for.

A category can hold both, and `Programming` does: seven leaf languages plus
`Node.js`, `Mobile development` and `Other`. `items` preserves file order so the two
kinds interleave in the form exactly as written, while `options` is the leaf-name list
that `skills` is index-aligned with.

The current file yields 12 entries, the leaves living inside them. `expertise[i]`
lines up with `EXPERTISE_ENTRIES[i]`, which is what `entryIndex` resolves for form
paths. Editing skills.md changes the form and stored drafts with no other code
change; `normalizeDraft` rebuilds entries from the catalog, drops any it no longer
lists, and matches leaf skills by name.

The step renders one nested checkbox tree: top-level categories stacked one per line,
and checking any node reveals its contents indented directly beneath it, so the
form's shape matches skills.md at a glance. `EntryNode` is recursive, which is what
keeps the nesting honest — one component renders every level, and depth comes from the
catalog rather than from hand-written levels.

Each revealed section is a `div` with `role="group"` and an `aria-label`, not a
`fieldset` with a `legend`: the checkbox already names that level, so a legend would
repeat it. Tests rely on those accessible names to assert the nesting.

The trade-off: entry keys are `string` rather than a literal union, because
TypeScript cannot infer literals from a file parsed at runtime. Membership is
enforced by a zod `refine` against the catalog instead of by the compiler.

Decisions in that change:

- **Experience is a single total in months**, capped at 720 (sixty years). It began as
  a years/months pair; `normalizeDraft` folds any stored years into the total rather
  than dropping them. The PDF still prints "5y 6m" rather than "66 months", since whole
  years read better on a CV — `formatExperience` does that conversion.
- **Expertise validation lives on the array, not on each entry.** `expertiseSchema`
  is `z.array(expertiseGroupSchema).superRefine(...)`, because the rules depend on
  neighbours: a category is satisfied by either a checked skill of its own or a
  checked sub-category, and an entry with any unchecked ancestor must not be
  validated at all since its section is hidden. A per-entry refinement can see
  neither. The ancestor check walks the full chain via `ancestorKeys`, not just the
  direct parent, since the tree can be deeper than two levels. Requirements apply
  only to checked things, so unchecking keeps data for later without failing
  validation in the meantime.
- **The "select at least one" error lands on `selected` or on `skills`** depending on
  whether the category has sub-categories. An open category shows it through its
  `RepeatableSection`, so `EntryNode` deliberately does not claim that path too —
  otherwise the message renders twice.
- **`selected` on a skill unifies both container kinds.** Predefined containers are
  seeded with one entry per catalog option, off by default, so unchecking a framework
  keeps the years and links already typed for it. Skills the user adds by hand are
  created already selected. Anything counting skills must filter on it.
- **A container-level error needs its own display in the predefined branch,** which
  has no `RepeatableSection` to surface it. `messageAtPath` moved to
  `src/components/fieldErrors.ts` and is shared by both.
- **`lastUsed` starts empty and is required once checked.** Defaulting it to any of
  the three options would assert something about the user's recency that may be
  false, so the select opens on "Select…".
- **Certification URL format is checked in the same refinement,** not on the field,
  for the same reason — a malformed URL in an unchecked group must not block the
  step.
- **Named `certificationLinks`,** to keep it distinct from the CV-level
  Certifications & Trainings section.
- **`DRAFT_KEY` is at v5.** v2 replaced free-text group names with a flat catalog, v3
  with the skills.md hierarchy keyed by path, v4 made level-1 headings selectable in
  their own right, and v5 introduced the `!` marker, which moved leaves out of the
  entry list and into their parent. No old shape maps onto the current one, so those
  drafts are discarded.
- **The PDF only emits skill-holding entries whose parent is also checked,** so an
  unchecked `Programming` hides its technologies from the CV even if they are still
  ticked underneath.

### Header geometry

The header was reworked after the template was restyled:

- **The chevrons are three left-pointing marks**, palest first, each with a
  90-degree tip and a triangular notch cut into the right side. The notch leaves *two*
  vertical right edges rather than one, which is what makes them read as chevrons
  rather than plain triangles. They sit tip-to-edge with no gap, so each tip lands on
  the axis formed by the right edges of the mark before it.

  `chevronPoints` derives the six points from the `CHEVRON` constant rather than
  hard-coding them, which keeps three properties true by construction: the vertical
  span is twice the mark width (that is what makes the tip 90 degrees, so changing the
  width keeps the angle), the notch edges stay parallel to the outer arms so both arms
  keep an even thickness, and the shape stays symmetric. Current values: 34pt marks in
  a 102x80 box, 13.6pt notch depth, 20.4pt arms. The geometry is unit-tested because
  pdfjs cannot see SVG — and note the fractional notch depth leaves floating-point
  dust, so those assertions use `toBeCloseTo`.
- **The name and headline share a centre axis.** `identityBlock` shrinks to the
  pill's width, so centring inside it lands both on the pill's centre rather than the
  header's. The pill itself is a row with `justifyContent: 'center'`, because
  `textAlign: 'center'` alone left the name at the content-box's left edge.
- **The contact details are pinned to the header's bottom-right** and 30% larger
  (`type.contact`, with the icons scaled to match). The absolute box anchors *both*
  `left` and `right`: with only `right` set it collapsed to a narrow width and wrapped
  the strings mid-word, so "Bucharest, Romania" rendered as "Buc" / "Rom" running off
  the page edge.

- **The page background is a vertical gradient** (`pageGradientTop` to
  `pageGradientBottom`). react-pdf's `backgroundColor` takes solid colours only, so
  `PageBackground` draws an SVG shading rect instead: `fixed` so it repeats on
  continuation pages, and rendered as each Page's first child so content paints over
  it. The page style keeps the top stop as a flat fallback.

  Two traps here. react-pdf reads gradient coordinates as `props.x2 || 1`, so passing
  `x2={0}` for a vertical axis silently becomes `1` and tilts the gradient — both x
  values are set to the page's centre line instead. And the pattern matrix flips y
  (`[1 0 0 -1 0 600]`), so the *first* stop is the one that lands at the page top.
  Tests assert the axis is vertical, spans the page, and carries the two theme colours.

- **Section label bars and the lateral card tabs are square**; only the card keeps a
  rounded corner.
- **The contact details are bold**, sharing the Roboto Bold subset with the name and
  headline.
- **A dashed rule closes the profile summary and qualifications sections**, reusing
  `rowDivider`. Each is drawn only when a later section follows, so the column never
  ends on a dangling rule. Its top margin is 4pt against 14pt below, which keeps the
  rule attached to the section it closes *and* keeps the left column on page one.

### Rich text fields

Profile summary, experience achievements and project descriptions are edited with a
small WYSIWYG editor (bold, italic, underline, bullet list) rather than plain
textareas.

**The stored shape is not the editor's.** `src/schema/richText.ts` defines a flat
model — a list of blocks, each a list of styled runs — and `richTextDoc.ts` converts
to and from Tiptap's nested document at the field boundary. The schema, the PDF and
the PPTX therefore all consume one stable shape that cannot drift if the editor
library changes, and zod validates it without recursion. Nested lists are not
representable, which is why the editor enables only a flat bullet list: the editor
cannot produce anything the exporters would have to drop.

- **The editor must never touch `editor.commands`.** Tiptap nulls its command manager
  on destroy, and that getter alone has no null check — `chain()` and `can()` fall back
  safely. StrictMode tears the editor down and remounts it, so an effect that writes
  content into a rehydrated draft hit the destroyed instance and threw. The effect now
  checks `isDestroyed` and goes through `chain()`. A test pins the library behaviour so
  the guard can be dropped if Tiptap ever fixes it.
- **The editor is lazy-loaded.** ProseMirror is about 109 kB gzipped; leaving it in
  the initial bundle took the main chunk from 113 kB to 244 kB. `RichTextField` holds
  the `useController` wiring and suspends on `RichTextEditor`, so the form paints
  without it — the same treatment react-pdf and pptxgenjs already get.
- **Bold and italic combine safely** because all four Roboto variants are registered;
  an unregistered combination would fail the whole PDF render.
- **The PPTX keeps live formatting** rather than flattened text, since pptxgenjs run
  options map onto the same marks.
- **Old drafts migrate**: `asRichText` accepts a plain string (before the editor) and
  the achievements mapper still folds a pre-textarea `bullets` array, so no
  `DRAFT_KEY` bump was needed.
- Formatting behaviour is unit-tested at the conversion layer rather than by driving
  ProseMirror under jsdom, which is where it can be asserted deterministically.

### Achievements as free text

Experience achievements were an array of bullet objects edited through a nested
`RepeatableSection`; they are now a single `achievements` textarea, one per line. The
rendered output is unchanged — `bulletLines` (formerly `profileBullets`) splits the
text and both exporters still draw bullets — so this simplifies the input without
touching the template. `profile.summary` already worked this way, which is why the
same helper serves both.

Old drafts are migrated rather than discarded: `normalizeDraft` folds a stored
`bullets` array into the textarea, one line per bullet, and prefers `achievements`
when both are present. That is why `DRAFT_KEY` did not need bumping for this change.

### The page budget

The two columns are a flex row, and react-pdf cannot split a row across pages. That
makes page one all-or-nothing, with two distinct failure modes once the left column
gets too tall:

- **A blank sheet between the two real pages.** Overflowing by even a point emits a
  continuation page carrying only the card background — no text.
- **Page one reduced to just the header,** when the row cannot fit at all and moves
  wholesale to the next page.

Neither degrades gradually, and the behaviour is not monotonic in content length, so
tuning by eye is unreliable — measure the page count instead. Things that were tried
and made no difference: the card's `flexGrow`, `Section`'s `minPresenceAhead`, and the
`fixed` gradient background. What does govern it is cumulative left-column spacing:
`rowDivider`'s margins (2 above, 6 below), `section`'s `marginBottom` (4) and
`bullet`'s `marginBottom` (1). Those values are load-bearing; growing them brings the
blank page back. Between them, the gap from a section's last line to the next
section's label is about 34pt against a 13.6pt line pitch.

Beyond a certain amount of content the second page is simply necessary, and the
current structure handles that badly — it moves the whole row rather than splitting.
Fixing that properly means making the columns independently breakable rather than one
row. `CvDocument.test.tsx` renders a realistically full CV and asserts two pages with
neither empty, which is what catches regressions here.
- **The card is rounded on its top-right corner only, at 52pt** (double the previous
  radius, now `cardRadius`). The other three corners are square.
- **The profile photo's 6pt white ring is a parent `View`'s background, not a border
  on the `Image`.** A border on an image is stroked *before* the image is painted, so
  the image covers it and nothing shows — which is exactly how it first shipped.
  `photoFrame` supplies the ring and pads by `photoBorder`; the image is clipped to
  `photoSize - photoBorder * 2`. The outer diameter stays `photoSize`, so the header
  layout is unchanged, and the visible image is 128pt rather than 140pt.

  Note when testing images: react-pdf silently skips an undecodable one, so a fixture
  with a malformed data URL will lay out correctly while painting nothing. Generate
  real PNG bytes for anything that asserts about an image.

Tests that touch the skill catalog derive their keys from `EXPERTISE_ENTRIES` rather
than naming categories, and `skillCatalog.test.ts` asserts structural invariants
rather than the file's current contents. skills.md is data the user edits, and naming
categories in tests made every edit break the suite.

`pdfLayout.test.tsx` (formerly `headerLayout.test.tsx`) reads the laid-out text positions back out of the rendered PDF
with `pdfjs-dist` and asserts the centring, the right-margin alignment and that
nothing wraps or overflows. That is a stronger check than the other document tests,
which only prove the file renders — it caught both of the bugs above. It cannot see
the SVG shapes, so the chevron geometry is unit-tested separately.

It also inspects filled paths from the operator list, which is how the card's corner
is verified. Two traps in reading those paths: the coordinates are in react-pdf's
drawing space where **y grows downward**, the opposite of the text positions in the
same file; and react-pdf emits four corner curves regardless of radius, so counting
curves proves nothing. A square corner is a degenerate curve passing through the
corner point, a rounded one never touches it. Bezier control points also sit on the
adjacent edges, so the helper keeps anchor points only.

## PPTX export

`src/preview/downloadPptx.tsx` is a second exporter alongside the PDF: a
pixel-matched recreation of the "short CV" PowerPoint deck at 10 x 6.25in (16:10),
built with `pptxgenjs`. Master graphics are embedded as base64 data URLs so the
export needs no template assets.

It renders from the same `src/pdf/model.ts` view model as the PDF, which is what
keeps the two exports consistent — the expertise reshape reached it for free, apart
from the certification links it had not been rendering. Those now appear beneath each
group as real hyperlinks, which PowerPoint supports and react-pdf does not.

- **`buildPptx` is split from `downloadPptx`** so the deck can be assembled and
  rendered under node in tests; `downloadPptx` only adds `writeFile`. Everything
  except the profile photo works headless — that path needs `fetch`, `Image` and
  canvas, so the fixtures leave `photo` empty.
- **Tests assert the archive is a valid zip and count slide parts** from the entry
  names rather than reading `pptx.slides`, which exists at runtime but is not in the
  library's typings.
- **`pptxgenjs` has no document language setting.** An earlier `pptx.lang` and
  `theme.lang` did not typecheck: `PptxGenJS` has no such property and `ThemeProps`
  carries only `headFontFace` and `bodyFontFace`. Both were removed.
- Like the PDF, the tests prove it renders, not that it looks right.

`src/preview/mmmdownloadPptx.tsx` is an earlier copy of this exporter that nothing
imports. It still typechecks, so it is dead weight rather than a hazard, but it
should be deleted.
- **PDF rendering stays one line per group** — `Java: Spring (Expert, 5y 6m, Within
  last month); Maven (Proficient)` — to keep the change inside the existing styled
  block. Certification URLs render as indented lines beneath each group via the
  `expertiseLink` style. In a narrow 8pt column long URLs will wrap; that style is
  the place to change it.

## Phase 3: skills manager

The expertise editor is built (see the revision above). What remains for this phase
is the polish:

- Autocomplete for skill names, backed by the `exampleSkills` util from
  `legacy/utils/` grown into a typed per-group catalog.
- Moving a skill between groups, which the current up/down controls cannot do.
- Optional: drag reordering via dnd-kit, replacing the buttons.

The soft skills input in the Languages & Soft Skills step is deliberately not part
of this: it is a flat list of names with no levels and no grouping.

Open question for the template: proficiency as dots or bars looks better but is
not machine-readable, whereas a text label ("Advanced") parses. To be decided
alongside the template design.

## Phase 4: PDF template (done)

Built from a supplied `CVPdfTemplate.jsx` that recreated a PowerPoint CV slide.
That template was kept as the visual specification — landscape 960x600 page, blue
header band, circular photo, white name pill, bordered card with section labels
notched into the border, and the two-column split — but three things had to change
before it could serve as a template:

- **Content is now data-driven.** The original had every string hardcoded
  (`profileBullets`, `kubisBullets`, `personalProjects`, the name and email) and
  took no props. `CvDocument` now takes a `Cv`, with all mapping in the pure
  `src/pdf/model.ts`.
- **Absolute positioning became flow layout.** Every element in the original was
  `position: 'absolute'` at a fixed offset with a fixed-height card. With
  user-supplied content of unknown length that clips or overlaps — the same failure
  the html2canvas approach had, and the reason react-pdf was chosen. Sections are
  now flex stacks that grow, with `wrap` and `minPresenceAhead` so overflow
  paginates and headings do not orphan. A test renders 120 bullets and asserts the
  page count grows rather than content vanishing.
- **Fonts are bundled, not fetched.** The gstatic URLs in the original returned 404,
  so its font registration would have failed at runtime. Roboto 400 and 700 are
  vendored in `src/pdf/fonts/` and registered from bundled URLs.

Schema mismatches resolved while mapping:

- The template rendered the profile as bullets; the form collects one textarea. Each
  non-empty line becomes a bullet, so a single-line summary reads as a paragraph.
- The template split certifications into "Certifications" and "Trainings"
  subheadings. The schema has one `certifications` array with no type
  discriminator, so they render as one list. Adding a `kind` field would restore
  the split.
- **The deferred proficiency question is resolved:** rated groups render as
  `Skill (Advanced)` using the shared `SKILL_LEVEL_LABELS`. Text, not dots, so the
  PDF stays machine-readable; groups with `showLevel` off render as plain lists.
- The template omitted dates on roles. Since the form collects them and a CV needs
  them, each role renders a `location | date range` meta line.
- Phone, website and LinkedIn were not in the original header; they now appear
  alongside email and location.

The Infosys logo is retained as `BRAND_LOGO` in `CvDocument.tsx`. It is static
branding rather than CV data, so it currently appears on every generated CV — set
the constant to null to drop it, or thread it through props to make it per-user.

Preview and download:

- `src/preview/usePdfBlobUrl.tsx` renders to a blob URL, debounced 500ms, keeping
  the previous URL live until the next render succeeds so the pane never blanks
  mid-edit, and revoking superseded URLs.
- `PdfPreview` subscribes with `useWatch` itself, so keystrokes do not re-render the
  form shell, and is `lazy`-loaded. react-pdf lands in its own 471 kB gzipped chunk
  and the initial bundle stays at 113 kB.
- Download regenerates rather than reusing the preview blob, so it always matches
  current state even mid-render.

Verified: `npm run typecheck`, `npm test` (81 passed), `npm run build`, and the dev
server serving the modules, fonts and logo. The document tests render real PDFs via
`renderToBuffer` in a node environment and assert the `%PDF` header, page counts,
conditional second page, pagination under overflow, and an embedded font subset
(proving selectable text rather than a raster image). They mock only the asset
imports, which Vite resolves to URLs that node cannot read — that smoke test is what
caught an unregistered italic font variant that would have failed in the browser.

**Not automatically verified:** how the rendered PDF actually looks. The tests prove
it renders, paginates and embeds text, not that the layout matches the slide. Run
`npm run dev` and compare against the original before trusting the visual fidelity.

### Original specification

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
