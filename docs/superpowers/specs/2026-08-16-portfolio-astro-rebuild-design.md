# Portfolio Rebuild — Astro System Map

**Date:** 2026-08-16
**Status:** Approved design, ready for implementation planning
**Design source:** Claude Design project `17472d3a-3ba4-4059-98d2-1f18929e9e6f`, file `Portfolio Redesign.dc.html`

## 1. Overview

Rebuild benpaulsen.tech from scratch in Astro 7, replacing the four-route Next.js site with a
single-screen interactive system map. The site presents Ben as a service in a system diagram:
eleven nodes wired by seventeen edges, with a detail panel that swaps as you move between them.

The current site has accumulated six years of drift — unused dependencies, mixed major versions,
a README describing a stack that no longer exists, and ~9.5MB of unoptimised images. This is a
replacement, not a migration. No code carries over.

### Goals

1. Match the approved design on desktop and mobile.
2. Ship a materially stronger SEO posture than the four-page site it replaces.
3. Strip the dependency surface to what the site actually uses.
4. Make the graph a single source of truth so the map cannot drift from the copy.

### Non-goals

- Preserving the `/projects`, `/skills` and `/experience` pages or their content.
- Server-side rendering, APIs, or a database. The output is fully static.
- Light mode. The design is dark-only and the site commits to it.
- Porting the design's canvas props (`accent`, `showLegend`, `showWiring`, `hoverTrace`). These are
  Claude Design authoring knobs, not site features.

## 2. Stack

| Package                         | Version        | Notes                                                        |
| ------------------------------- | -------------- | ------------------------------------------------------------ |
| astro                           | 7.2.2          | requires Node >= 22.12                                       |
| tailwindcss / @tailwindcss/vite | 4.3.3          | via `astro add tailwind`; not the legacy `@astrojs/tailwind` |
| typescript                      | 6.0.3          | see constraint below                                         |
| @astrojs/check                  | 0.9.10         |                                                              |
| @astrojs/sitemap                | 3.7.3          |                                                              |
| vitest                          | 4.1.10         |                                                              |
| @playwright/test                | 1.62.1         |                                                              |
| prettier                        | 3.9.6          | + `prettier-plugin-astro`, `prettier-plugin-tailwindcss`     |
| eslint                          | 10.8.1         | + `eslint-plugin-astro`, `typescript-eslint`                 |
| husky / lint-staged             | 9.1.7 / 17.3.0 |                                                              |

No UI framework. No `@astrojs/vercel` adapter — static output deploys to Vercel as-is.

**TypeScript is pinned to 6.0.3, not the latest 7.0.2.** `@astrojs/check@0.9.10` declares
`peerDependencies.typescript: "^5.0.0 || ^6.0.0"`, so TS 7 would cost us type-checking of `.astro`
templates and content collection types — `tsc` alone cannot parse `.astro` files. Revisit the moment
`@astrojs/check` widens its range; it should be a one-line bump.

### Astro 7 constraints that shape the build

Confirmed against the v6 and v7 upgrade guides and the current docs, not assumed:

- Content lives in `src/content.config.ts` with a `loader`. The legacy `src/content/config.ts`
  collection API was removed in v6.
- Schemas are **Zod 4** (`z.email()`, not `z.string().email()`; `.default()` must match output type).
- Markdown is processed by **Sätteri**, not remark/rehype. Our prose is paragraphs and links, so it
  needs no configuration — but remark/rehype plugins would require installing
  `@astrojs/markdown-remark` explicitly.
- Rendering is the imported `render(entry)` function, not `entry.render()`.
- The Rust compiler is default and errors on unclosed tags.
- `compressHTML` defaults to `'jsx'`, stripping whitespace between inline elements more
  aggressively. **Verify the `·`-separated mono labels keep their spacing** — this design uses that
  pattern heavily (`PROJECT · NOVEMBER 2025 · SOCIAL`, `TS · NEXT.JS · DRIZZLE · POSTGRES`).
- `getStaticPaths()` cannot access the `Astro` object. Canonical URLs come from
  `import.meta.env.SITE`.
- The image service never upscales and crops by default. All four project screenshots exceed the
  158px-tall panel slot, so this is fine.

## 3. Content model

One Astro content collection, `nodes`, loaded by `glob()` from `src/content/nodes/*.md`. Eleven
entries. Frontmatter carries structure; the markdown body is the panel prose.

```ts
// src/content.config.ts (Zod 4)
const nodes = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/nodes" }),
  schema: ({ image }) =>
    z.object({
      label: z.string(), // chip + panel heading, e.g. "WatchThis"
      kind: z.enum(["core", "capability", "project", "job", "education"]),
      order: z.number(), // sort within kind; drives reverse-index ordering
      meta: z.string(), // chip subtitle, e.g. "PROJECT · 2025"
      eyebrow: z.string(), // panel kicker, e.g. "PROJECT · NOVEMBER 2025 · SOCIAL"
      pos: z.object({ x: z.number(), y: z.number() }), // desktop, 0–1
      posMobile: z.object({ x: z.number(), y: z.number() }).optional(), // narrow-map override
      wiredTo: z.array(z.string()).default([]),
      tags: z.array(z.string()).optional(), // capability pills
      stack: z.string().optional(), // "TS · NEXT.JS · DRIZZLE · POSTGRES"
      links: z
        .array(
          z.object({
            label: z.string(),
            href: z.string().optional(), // absent = rendered as inert text
            accent: z.boolean().default(false),
          })
        )
        .default([]),
      screenshot: image().optional(),
      seo: z.object({ title: z.string(), description: z.string() }),
    }),
});
```

`links[].href` is optional so DeckOS's "live demo (soon)" renders as text rather than the design's
`href="#"`, which is a dead link to a crawler.

### Node inventory

Positions are normalised 0–1, taken directly from the design. The design hand-tunes nine of eleven
for the narrow mobile map — chips occupy proportionally more width there, so nodes are pushed
outward. Both renditions use `preserveAspectRatio="none"`, so within each, percentage-positioned
chips stay glued to their line endpoints at any container size.

| id              | kind       | label         | desktop x,y | mobile x,y | wiredTo                                   |
| --------------- | ---------- | ------------- | ----------- | ---------- | ----------------------------------------- |
| `ben`           | core       | ben.paulsen   | .500, .500  | .500, .500 | frontend, backend, platform, product, qut |
| `frontend`      | capability | frontend      | .500, .240  | .500, .245 | —                                         |
| `backend`       | capability | backend       | .780, .500  | .850, .500 | —                                         |
| `platform`      | capability | platform      | .500, .760  | .500, .755 | —                                         |
| `product`       | capability | product       | .220, .500  | .150, .500 | —                                         |
| `deckos`        | project    | DeckOS        | .853, .195  | .833, .122 | frontend, backend, platform               |
| `watchthis`     | project    | WatchThis     | .878, .650  | .856, .745 | frontend, backend                         |
| `api-workshop`  | project    | API Workshop  | .711, .877  | .644, .923 | frontend, platform                        |
| `imperfections` | project    | Imperfections | .302, .873  | .289, .918 | frontend                                  |
| `gruntify`      | job        | Gruntify      | .156, .208  | .156, .122 | frontend, backend, platform, product      |
| `qut`           | education  | QUT           | .124, .780  | .144, .765 | —                                         |

The design's internal ids `interface` and `services` are renamed `frontend` and `backend`, deleting
the design's `label = { interface: 'frontend', services: 'backend' }` lookup table entirely.

### Everything else is derived

The design hardcodes the same facts three times: seventeen `<line>` elements, a prose
`wired to → …` string per panel, and a `11 nodes · 17 edges` footer. `src/lib/graph.ts` derives all
three from `wiredTo`:

- **Edges** — one per `wiredTo` entry, undirected, emitted with `data-edge="a b"` so the trace logic
  matches the design's. Verified: the six `wiredTo` arrays above reconstruct exactly the design's
  seventeen lines (ben 5 + deckos 3 + watchthis 2 + api-workshop 2 + imperfections 1 + gruntify 4).
- **Reverse index** — the `wired to → …` line is a node's neighbours, sorted by kind
  (`capability`, `job`, `project`, `education`), then `order`, **excluding `core` unless core is the
  only neighbour**. Verified against all eleven panels in the design: `frontend` yields
  "Gruntify · DeckOS · WatchThis · API Workshop · Imperfections", `deckos` yields
  "frontend · backend · platform", `qut` falls back to "ben.paulsen". Exact matches throughout.
- **Counts** — the footer's `11 nodes · 17 edges` reads from the collection.
- **Years** — `6 yrs` in the stat tiles and `uptime 6 yrs` in the footer compute from a
  `CAREER_START = 2020` constant so they never go stale.

A build-time assertion fails the build if any `wiredTo` id has no matching entry.

## 4. Rendering

### Desktop

64px header (wordmark, role/location, "OPEN TO INTERESTING WORK", three links), then a
`1fr / 440px` grid: map left on a dotted radial-gradient canvas, detail panel right. The page does
not scroll; only the panel's overflow does. Legend bottom-left, counts bottom-right.

### Mobile

Header, a fixed 392px pan-and-pinch-zoom map, a horizontal legend strip, then the detail panel
taking remaining height and scrolling. Zoom in/out/fit buttons bottom-right of the map.

Both renditions render the same eleven panels; CSS decides which layout is live. Panels are
**always present in the DOM as static HTML** — never injected by JS — which is what makes the site
readable without JS and gives crawlers the full copy on every route.

## 5. Interaction

Three small vanilla TS modules, no framework runtime. Target is ~3KB of JS.

| module               | responsibility                                                           |
| -------------------- | ------------------------------------------------------------------------ |
| `scripts/map.ts`     | hover tracing, node selection, history integration                       |
| `scripts/panzoom.ts` | mobile pointer pan, pinch zoom, zoom buttons, drag-vs-tap discrimination |
| `scripts/status.ts`  | Brisbane time-of-day status, ticking every 60s                           |

**The island writes only data attributes, never styles.** The design mutates inline styles across
seventeen edges and eleven nodes on every hover (`e.setAttribute("stroke", …)`,
`n.style.opacity = …`). Instead the modules flip `data-active`, `data-traced` and `data-dimmed`, and
Tailwind variants (`group-data-[dimmed]:opacity-30`) do the rendering. Presentation stays in CSS,
the TS stays graph logic, and `prefers-reduced-motion` becomes a CSS override rather than a JS
branch.

### Status line

The design's `statusWord()` is ported with two corrections:

1. Its final `else s = weekday ? "fiddling" : "projecting"` has an **unreachable branch** — weekday
   08:00–16:59 is caught by the earlier `working` case, so only weekend hours reach the fallback and
   `"fiddling"` can never fire. Collapse to a single value.
2. Replace the manual `getTimezoneOffset() + 600` arithmetic with `Intl.DateTimeFormat` on
   `Australia/Brisbane`, which stays correct if Queensland ever adopts DST.

Behaviour is otherwise unchanged: `sleeping` / `waking up` / `working` / `cooking` / `projecting` /
`relaxing` / `fiddling with the homelab`, rendered as `brisbane · currently …` on desktop and
`currently …` on mobile.

### Reduced motion

`prefers-reduced-motion: reduce` disables the 24s `bpDash` edge march and the `bpPulse` core-node
pulse, and reduces panel transitions to an instant swap. Pan/zoom remains available.

## 6. Routing

Eleven prerendered static routes:

- `index.astro` → `/`, `ben` panel active
- `[node].astro` via `getStaticPaths()` → `/frontend`, `/backend`, `/platform`, `/product`,
  `/deckos`, `/watchthis`, `/api-workshop`, `/imperfections`, `/gruntify`, `/qut`

Every route emits identical DOM, differing only in which panel carries `data-active` and in its head
metadata. Active state is decided at build time, so **the site works fully with JS disabled**.

Node chips are real `<a href="/watchthis">` elements, not the design's `<div>` with a click handler.
This gives keyboard navigation, focus rings, middle-click and open-in-new-tab for free, and a
coherent screen-reader link list.

JS intercepts click, calls `history.pushState` with the node's real path, and swaps the active panel
without a reload. `popstate` restores. **Not fragments** — a copied URL must be the indexable
prerendered page, and `/#watchthis` would be collapsed to `/` by crawlers, undercutting the mirror
routes. No `ClientRouter` / view transitions: there is no navigation to transition, only a CSS
opacity swap.

## 7. SEO

The old site had four indexable URLs and no structured data. This replaces that with:

- **11 URLs**, each with its own `<title>`, meta description, canonical and OG image, authored per
  node in the `seo` frontmatter.
- **JSON-LD `@graph`** on every page: a `Person` with `worksFor` → Gruntify, `alumniOf` → QUT and
  `knowsAbout` → the capabilities; each project as a `SoftwareApplication` with `author` back to the
  Person. On a node route, that node becomes `mainEntity`.
- **OG images generated at build** from one dark template (node label, kind, accent), so they cannot
  go stale as content changes.
- `@astrojs/sitemap` and a `robots.txt`.
- Core Web Vitals: removing `backdrop.webp` (2.5MB) and `profile.png` (2.8MB) is most of the win
  before counting ~3KB of JS against the current React bundle.

### Redirects

Permanent 301s in `vercel.json`. The old site only ever had these four routes.

| from          | to          | rationale                                                  |
| ------------- | ----------- | ---------------------------------------------------------- |
| `/projects`   | `/deckos`   | newest project; the map behind it shows all four           |
| `/skills`     | `/frontend` | lead capability                                            |
| `/experience` | `/gruntify` | current role, with REX Energy and Grey Matta in that panel |

`not-found.tsx` becomes `404.astro` in the new visual language.

## 8. Styling

Tailwind 4 via `@tailwindcss/vite`. Tokens in an `@theme` block — the design is already in oklch:

```css
@import "tailwindcss";
@theme {
  --color-canvas: #0b0d11;
  --color-panel: #0e1116;
  --color-chip: #12161c;
  --color-ink: #e6e9ee;
  --color-accent: oklch(0.8 0.16 165);
  --color-job: oklch(0.82 0.14 75);
  --color-edu: oklch(0.75 0.14 300);
  --color-cap: #8d97a8;
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

`color-scheme: dark`. The design's third font, IBM Plex Mono, is used only on the Claude Design
canvas chrome (browser bezel labels) and is dropped.

Fonts are self-hosted rather than loaded from the design's Google Fonts CDN link — two fewer
third-party connections and a better LCP behind Cloudflare. Use Astro's built-in font API if it is
stable in 7; otherwise `@fontsource-variable/space-grotesk` and `@fontsource-variable/jetbrains-mono`.

## 9. Assets

**Kept**, moved from `public/` to `src/assets/` so the image service processes them into
AVIF/WebP at responsive widths: `deckos.png`, `watchthis.png` (1.09MB), `api-workshop.png`,
`imperfections.png` (1.28MB).

**Deleted:** `backdrop.webp` (2.5MB), `profile.png` (2.8MB) — the new design has no profile photo —
all 20 skill icons, all 5 experience logos, and six retired project images (`meta.png` 2.8MB,
`config-editor.png`, `tjobhub.png`, `webspider.png`, `yt-stats.png`, and `nocportal.png`, which is
already referenced by nothing). Roughly **9.5MB removed**.

**Favicon:** replace the 152KB `.ico` with a `b.` monogram — Space Grotesk lowercase, accent on
canvas dark — as an SVG plus a small ICO fallback.

## 10. Accessibility

- Node chips are links; the map is a `<nav>` with an accessible name.
- Panels are `<article>` elements. Inactive ones get the `inert` attribute, which removes them from
  the accessibility tree and focus order while still rendering — so screen readers see one panel at
  a time, and the design's opacity/transform cross-fade still runs. (`hidden` would remove them from
  layout and kill the transition; the design's `opacity: 0; pointer-events: none` alone leaves them
  fully readable to screen readers.)
- Visible focus rings on the dark canvas, meeting contrast against `--color-canvas`.
- The status line updates via `aria-live="off"` — it is ambient, not an announcement.
- Zoom buttons are real `<button>`s with labels.
- Body copy verified against WCAG AA on `--color-canvas`. The design's dimmest tier —
  `rgba(230,233,238,.28)` for the footer counts — is decorative metadata; check it and lift it if it
  fails.

## 11. Testing

**Vitest** — pure logic only:

- `statusWord()` across all boundaries and both weekday/weekend paths, with the timezone injected.
- Graph derivation: edge count is 17, edges are symmetric and unique, no `wiredTo` id is dangling,
  reverse-index ordering matches the design's eleven panels.
- Content schema accepts the eleven real entries and rejects malformed ones.
- Career-year computation.

**Playwright** — smoke:

- Clicking each of the eleven nodes activates the right panel and pushes the right URL.
- Loading each mirror route directly serves that panel already active.
- Back/forward restore the correct panel.
- **With JS disabled**, every route renders its panel and all eleven panels' copy is present.
- Mobile viewport: zoom in/out/fit change the map transform; a drag does not trigger node selection.

## 12. Delivery

Branch `astro-rebuild` off `master`. One PR, reviewed against Vercel's preview URL before merge.

**Removed:** `app/`, `data/`, `lib/` (empty), `next.config.js`, `next-env.d.ts`, `eslint.config.mjs`,
most of `public/`.
**Kept:** git history, `license.md`.
**Rewritten:** `package.json` (v4.0.0), `README.md` — the current one claims Next 13, an Apps
directory and Firebase, none of which are true.

CI via GitHub Actions on every PR: `astro check`, ESLint, Vitest, Playwright, build.
Node pinned to >= 22.12 via `engines` and `.nvmrc`.

**Manual step, outside the repo:** the Vercel project's framework preset must change from Next.js to
Astro. DNS and the Cloudflare proxy stay untouched.

## 13. Content decisions

- Email is `ben.paulsen4@gmail.com`. The design's `hello@benpaulsen.tech` does not exist.
- LinkedIn is `https://www.linkedin.com/in/ben-paulsen-26979b237/`. The design has a bare
  `https://www.linkedin.com/` placeholder.
- "OPEN TO INTERESTING WORK" ships as designed.
- `CAREER_START = 2020`, driving "6 yrs shipping software" and "uptime 6 yrs".
- "3 companies so far" counts Gruntify, REX Energy and Grey Matta Solutions.
- All panel copy comes from the design, which is a full rewrite. None of the current site's prose
  carries over.

## 14. Risks

| risk                                                      | mitigation                                              |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `compressHTML: 'jsx'` mangles `·`-separated inline labels | Verify early; set `compressHTML: true` if so            |
| Sätteri renders prose differently to remark               | Prose is trivial; Playwright asserts panel copy         |
| One coordinate set proves insufficient on some viewport   | `posMobile` already carries the design's nine overrides |
| TS 6 pin drifts from ecosystem                            | Bump when `@astrojs/check` accepts TS 7                 |
| Vercel preset change forgotten                            | Called out as an explicit pre-merge step                |
