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
phase breakdown and the known constraints. Phase 0 (toolchain) is complete;
`src/` currently renders a placeholder shell.

The repo began as a fork of an Odin-Project-style CV builder. That codebase now
sits in `legacy/` as design reference only:

- Nothing in `src/` imports it, it is outside the `tsconfig.app.json` include and
  the Vitest include glob, and it does not typecheck or build.
- It gets deleted once Phase 1 renders the real shell.
- Do not extend it or copy its patterns. It stores form data as a positional
  array where consumers hardcode indexes (`info[0].value`, `info[8]`), mutates
  state objects in place before `setState`, and generates its PDF by
  screenshotting the DOM with html2canvas — the three problems this rewrite
  exists to fix. Its CSS and markup are worth reading; its data flow is not.

`src/icons/` is retained from the old tree because the new app reuses the assets.
Icons in `legacy/` are loaded via `require()`, which Vite does not support, so any
icon carried across needs converting to an ESM import.

## Architecture

Target shape, as specified in the plan. Phases 1 through 4 build this out:

- **`src/schema/`** — zod schemas are the single source of truth. Types come from
  `z.infer`, so validation, TypeScript types and form defaults all derive from one
  definition. Do not hand-write a parallel interface for CV data.
- **Form state** — one `useForm` (react-hook-form) at the builder root is the only
  store. Do not add a context or reducer holding the same data; the two will drift.
  The preview subscribes through `useWatch` with a debounce.
- **Steps** — a data array of `{ id, title, fieldPaths, Component }` on
  react-router URLs. The progress indicator, next/back and per-step validation all
  derive from that array, so adding a step means adding an entry, not editing
  navigation logic. `Next` calls `trigger(fieldPaths)` for the current step.
- **`src/pdf/`** — `@react-pdf/renderer` components are both the preview and the
  download; one template definition, so the two cannot diverge. Note this is a
  different package from `react-pdf`, which is a viewer for existing PDFs and was
  removed. The template uses react-pdf's own StyleSheet subset, not CSS Modules,
  and it cannot flow content between columns — a sidebar layout only works if the
  sidebar always fits on one page.

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
