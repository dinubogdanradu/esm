# CV Builder

A React single-page app that collects CV data through a multi-step form and
renders it as a downloadable PDF from a custom template, with a live preview
updating beside the form as you type.

## Status

In development. Phase 0 of [docs/PLAN.md](docs/PLAN.md) is complete: the Vite +
TypeScript toolchain is in place and `src/` renders a placeholder shell. The
multi-step form, skill manager and PDF template are not built yet. The upstream
codebase this replaces sits in `legacy/` as reference and will be deleted once
Phase 1 lands.

## What it does

- **Multi-step form.** Sections are filled one step at a time, with per-step
  validation gating navigation and progress kept in the URL so the back button
  and deep links work.
- **Detailed skill management.** Skills are organised into user-defined
  categories (languages, frameworks, tools) with an optional proficiency level
  per skill and autocomplete from a preset catalog.
- **Custom PDF template.** The CV is a real PDF with selectable, machine-readable
  text and automatic multi-page flow, not a screenshot of the preview. The same
  document definition drives both the preview and the download, so the two cannot
  drift apart.
- **Autosave.** Form state persists to localStorage, so a refresh does not lose
  a half-finished CV.

## Stack

- React 19, TypeScript, Vite
- react-hook-form + zod for form state and validation
- @react-pdf/renderer for the template, preview and export
- CSS Modules

## Development

```bash
npm install
npm run dev        # vite dev server on :5173
npm test           # vitest, single run
npm run test:watch # vitest in watch mode
npm run typecheck  # tsc -b, no emit
npm run build      # typecheck then production build to dist/
```

Deploying to a GitHub Pages project page needs the repo path as the base:

```bash
VITE_BASE=/<repo>/ npm run build && npm run deploy
```

## Documentation

- [docs/PLAN.md](docs/PLAN.md) — architecture decisions, known constraints and
  the phased implementation plan.

## Credits

Based on [gianlucajahn/CV-Application](https://github.com/gianlucajahn/CV-Application),
whose form, preview and PDF download were the starting point for this rewrite.
