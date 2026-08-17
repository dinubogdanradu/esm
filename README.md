# CV Builder

A React single-page app that collects CV data through a multi-step form and
renders it as a downloadable PDF from a custom template, with a live preview
updating beside the form as you type.

## Status

In development, but end to end working: fill in the form, watch the live PDF preview
update, download the result. Phases 0, 1, 2 and 4 of [docs/PLAN.md](docs/PLAN.md)
are complete. Remaining: skill autocomplete and moving skills between groups
(Phase 3), and the polish pass in Phase 5. The upstream codebase this replaces sits
in `legacy/` as reference.

## What it does

- **Multi-step form.** Sections are filled one step at a time, with per-step
  validation gating navigation and progress kept in the URL so the back button
  and deep links work.
- **Detailed skill management.** Skills are organised into user-defined
  categories (languages, frameworks, tools) with an optional proficiency level
  per skill and autocomplete from a preset catalog.
- **Custom PDF template.** A landscape two-column layout with a blue header band,
  rendered as a real PDF with selectable, machine-readable text and automatic
  multi-page flow, not a screenshot of the preview. The same document definition
  drives both the preview and the download, so the two cannot drift apart.
- **PowerPoint export.** The same CV also exports as a .pptx deck, built from the
  same view model as the PDF.
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
