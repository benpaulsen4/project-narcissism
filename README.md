# Project Narcissism

The personal portfolio site of Ben Paulsen — [benpaulsen.tech](https://benpaulsen.tech).

The site is a single-screen system map: eleven nodes representing capabilities, projects,
work and education, wired together by edges derived from the content itself. Selecting a
node swaps the detail panel and updates the URL without a page load.

## Stack

- **Astro 7** — fully static output, no UI framework
- **Tailwind 4** — theme tokens in `src/styles/global.css`
- **TypeScript 6** — pinned; `@astrojs/check` does not yet accept TS 7
- **pnpm 11** — pinned via `packageManager`
- Hosted on **Vercel** behind a **Cloudflare** proxy

## Getting started

Requires Node >= 22.12 and pnpm 11.

```bash
pnpm install
pnpm dev
```

## Commands

| Command        | What it does                     |
| -------------- | -------------------------------- |
| `pnpm dev`     | Dev server on :4321              |
| `pnpm build`   | Static build to `dist/`          |
| `pnpm preview` | Serve the build locally          |
| `pnpm check`   | Astro + TypeScript type checking |
| `pnpm lint`    | ESLint                           |
| `pnpm test`    | Vitest unit tests                |
| `pnpm e2e`     | Playwright smoke tests           |

## Editing content

Every node is one markdown file in `src/content/nodes/`. Frontmatter carries structure;
the body is the panel prose. Adding a project means adding one file — the map's edges,
each panel's "wired to →" line, and the node and edge counts are all derived from the
`wiredTo` arrays, so nothing else needs updating.

Positions are normalised 0–1. `pos` is the desktop layout; `posMobile` overrides it on
the narrow map, where chips take proportionally more width.

## Implementation notes

Two decisions in the code are not obvious from reading it in isolation:

- **`compressHTML: true` in `astro.config.mjs` must stay `true`.** Astro's `'jsx'`
  compression mode collapses whitespace, which destroys the `·`-separated spacing in the
  inline mono labels used across the map and panels. Don't switch compression modes to
  chase a smaller build without re-checking that spacing.
- **`data-dragged` on the pan/zoom container (`src/scripts/panzoom.ts`,
  read by `src/scripts/map.ts`) distinguishes a pan from a tap.** Touch pan/zoom and node
  selection share the same pointer events on mobile; without this flag, a drag that ends
  over a node chip would also fire that chip's navigation.

## Deployment

Vercel builds `dist/` from `master`. Redirects for the retired routes live in
`vercel.json`. The project requires `ENABLE_EXPERIMENTAL_COREPACK=1` set as an
environment variable so builds use pnpm 11 rather than falling back to pnpm 10.
