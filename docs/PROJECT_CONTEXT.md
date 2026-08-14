# Project Context

Purpose
- A Vite + TypeScript React SPA for building downloadable, machine-readable CVs (multi-step form + live preview + PDF export).

Status
- Phase 0 and Phase 1 complete (toolchain, zod data model, nine-step form shell, autosave). PDF template, per-step UIs and skill manager remain (Phase 2+).

Stack
- React 19 + TypeScript, Vite
- react-hook-form + zod for form state and validation
- CSS Modules
- Vitest for tests
- Planned PDF engine: @react-pdf/renderer

Key files
- [package.json](package.json) — scripts: `dev`, `build`, `test`, `typecheck`.
- [README.md](README.md) — overview and developer instructions.
- [docs/PLAN.md](docs/PLAN.md) — phased implementation plan and design decisions.
- [src/main.tsx](src/main.tsx) — app entry.
- [src/App.tsx](src/App.tsx) — top-level router (`HashRouter`).
- [src/builder/CvBuilder.tsx](src/builder/CvBuilder.tsx) — form shell and navigation.
- [src/schema/cv.ts](src/schema/cv.ts) — zod schemas and inferred `Cv` type.
- `legacy/` — original JS app kept as a reference implementation.

Dev commands
```
npm install
npm run dev
npm run typecheck
npm test
```

Next suggested work
- Implement Phase 2: replace step placeholders with real forms and schema slices.
- Build the skills manager UI and autocomplete/catalog.
- Implement Phase 4: `CvDocument` using `@react-pdf/renderer` and live preview.
