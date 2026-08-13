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
phase breakdown and the known constraints. Phases 0 (toolchain) and 1 (data model
and form shell) are complete. Each of the nine steps renders a placeholder listing
the fields it will own; Phase 2 replaces the `Component` on each entry in `STEPS`
and should need to change nothing else.

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
- **`src/builder/steps.ts`** — `STEPS` is the single source of step order, titles,
  and validation scope. The progress nav, next/back and PDF section order all
  derive from it, so adding a section means adding an entry there. `validate` holds
  section-level paths because `trigger('personal')` validates the whole subtree.
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
- **`src/pdf/`** (Phase 4) — `@react-pdf/renderer` components will be both the
  preview and the download; one template definition, so the two cannot diverge.
  Note this is a different package from `react-pdf`, a viewer for existing PDFs,
  which was removed. The template uses react-pdf's own StyleSheet subset, not CSS
  Modules, and cannot flow content between columns — a sidebar layout only works if
  the sidebar always fits on one page.

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

Keep `@types/react` and `@types/react-dom` on the same major as the React runtime.
npm will happily install types a major ahead, which produces type errors that look
like real bugs.
