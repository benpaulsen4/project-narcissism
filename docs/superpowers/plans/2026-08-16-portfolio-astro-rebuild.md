# Portfolio Astro Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four-route Next.js portfolio at benpaulsen.tech with a single-screen Astro 7 system map — eleven nodes, seventeen derived edges, a detail panel per node — matching the approved Claude Design mock.

**Architecture:** Fully static Astro. All eleven detail panels render as HTML at build time on every route; only `data-active` and head metadata differ between routes. Three small vanilla TS modules add hover tracing, panel swapping with `history.pushState`, mobile pan/zoom and a live status line. The eleven content files declare `wiredTo`; edges, the "wired to →" prose, and the node/edge counts are all derived from it, so the map cannot drift from the copy.

**Tech Stack:** Astro 7.2.2, Tailwind 4.3.3, TypeScript 6.0.3, pnpm 11.22.0, Vitest 4, Playwright 1.62, deployed static to Vercel.

**Spec:** `docs/superpowers/specs/2026-08-16-portfolio-astro-rebuild-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Node** >= 22.12. **pnpm** 11.22.0, pinned via `"packageManager": "pnpm@11.22.0"`. Never run `npm` or `npx` — use `pnpm` and `pnpm exec`.
- **Astro 7 APIs differ from Astro 5.** Content config lives at `src/content.config.ts` (not `src/content/config.ts`), collections require a `loader`, schemas are **Zod 4**, and rendering uses the imported `render(entry)` function (not `entry.render()`). If any API in this plan does not typecheck, trust `pnpm exec astro check` and the official docs over this document, and report the discrepancy rather than working around it.
- **No UI framework.** No React, Preact, Svelte or Vue. Interactivity is plain TS modules in `<script>` tags.
- **The island writes only `data-*` attributes, never inline styles.** All visual state lives in CSS.
- **Accent colours** are exact: accent `oklch(0.8 0.16 165)`, job `oklch(0.82 0.14 75)`, education `oklch(0.75 0.14 300)`, capability `#8d97a8`. Canvas `#0b0d11`, panel `#0e1116`, chip `#12161c`, ink `#e6e9ee`.
- **Copy is verbatim from the design.** Do not rewrite, shorten, or "improve" any user-facing prose in this plan. Two corrections are already applied and must be kept: email is `ben.paulsen4@gmail.com` (not the design's `hello@benpaulsen.tech`), and LinkedIn is `https://www.linkedin.com/in/ben-paulsen-26979b237/` (not the design's bare placeholder).
- **`CAREER_START = 2020`.** Never hardcode "6 yrs" anywhere.
- Commit after every task. Conventional commit prefixes (`feat:`, `test:`, `chore:`, `refactor:`).

---

## File Structure

| File                                            | Responsibility                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `package.json`, `pnpm-workspace.yaml`, `.nvmrc` | toolchain + pnpm 11 build-script allowlist                                   |
| `astro.config.mjs`                              | site URL, Tailwind vite plugin, sitemap, compressHTML                        |
| `src/content.config.ts`                         | the `nodes` collection schema (Zod 4)                                        |
| `src/content/nodes/*.md`                        | eleven node files: frontmatter + panel prose                                 |
| `src/lib/graph.ts`                              | pure graph derivation — edges, neighbours, wired-to labels, counts           |
| `src/lib/dates.ts`                              | pure date logic — `statusWord()`, `careerYears()`                            |
| `src/lib/nodes.ts`                              | loads the collection, sorts, adapts entries into the shape components expect |
| `src/styles/global.css`                         | Tailwind import + `@theme` tokens + keyframes + reduced-motion               |
| `src/layouts/Base.astro`                        | html shell, fonts, head metadata, JSON-LD                                    |
| `src/components/Header.astro`                   | wordmark, role line, open-to-work, contact links                             |
| `src/components/Map.astro`                      | dotted canvas, SVG edge layer, node chips, legend, counts                    |
| `src/components/NodeChip.astro`                 | one node chip (`<a>`)                                                        |
| `src/components/Panel.astro`                    | one detail panel, all node kinds                                             |
| `src/components/Legend.astro`                   | the four-kind key                                                            |
| `src/pages/index.astro`                         | `/` with `ben` active                                                        |
| `src/pages/[node].astro`                        | the other ten routes                                                         |
| `src/pages/404.astro`                           | not found                                                                    |
| `src/pages/og/[node].png.ts`                    | build-time OG image generation                                               |
| `src/scripts/map.ts`                            | hover trace, selection, history                                              |
| `src/scripts/panzoom.ts`                        | mobile pan + pinch zoom                                                      |
| `src/scripts/status.ts`                         | status line ticker                                                           |
| `tests/*.test.ts`                               | Vitest unit tests                                                            |
| `e2e/*.spec.ts`                                 | Playwright smoke tests                                                       |
| `vercel.json`                                   | 301 redirects                                                                |

---

## Task 1: Scaffold — remove Next, stand up Astro 7 on pnpm 11

**Files:**

- Delete: `app/`, `data/`, `lib/`, `next.config.js`, `next-env.d.ts`, `eslint.config.mjs`, `package-lock.json`, `tsconfig.json`, `.husky/`
- Create: `package.json`, `pnpm-workspace.yaml`, `astro.config.mjs`, `tsconfig.json`, `.nvmrc`, `src/pages/index.astro`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: nothing.
- Produces: a working Astro 7 project that `pnpm build` completes. All later tasks assume `pnpm dev`, `pnpm build`, `pnpm check` work.

- [ ] **Step 1: Confirm the toolchain before changing anything**

```bash
node -v    # must be >= 22.12
pnpm -v    # must be 11.x
```

If `pnpm` is missing, install it globally (`npm i -g pnpm@11.22.0`) — this is the one permitted use of npm.

- [ ] **Step 2: Delete the Next.js application**

```bash
git rm -r --cached app data lib
rm -rf app data lib .husky .next node_modules
rm -f next.config.js next-env.d.ts eslint.config.mjs package-lock.json tsconfig.json
```

`lib/` is empty and `.next/` is build output. Leave `public/`, `license.md` and `README.md` for now — Task 11 and Task 15 handle those.

- [ ] **Step 3: Scaffold Astro into a temp directory and copy the canonical config out**

Do not hand-write the Astro config from memory. Generate it, so the idioms match Astro 7 exactly:

```bash
cd /tmp && pnpm create astro@latest astro-seed --template minimal --no-install --no-git --skip-houston
```

Read `/tmp/astro-seed/astro.config.mjs`, `tsconfig.json` and `package.json`. Use them as the basis for the files below, adjusting to match. If the generated shape differs from what this task shows, **follow the generated shape** and note the difference.

- [ ] **Step 4: Write `package.json`**

```json
{
  "name": "project-narcissism",
  "version": "4.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.22.0",
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "format": "prettier --write ."
  },
  "dependencies": {
    "astro": "7.2.2"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "typescript": "6.0.3"
  }
}
```

TypeScript is pinned to 6.0.3 deliberately — `@astrojs/check@0.9.10` peers `^5 || ^6` and will not accept TS 7. Do not "upgrade" it.

- [ ] **Step 5: Write `pnpm-workspace.yaml`**

```yaml
allowBuilds:
  esbuild: true
  sharp: true
```

pnpm 11 blocks dependency build scripts unless allowlisted here, and `strictDepBuilds` defaults to `true` so an unlisted one fails the install. Astro needs `sharp` for image processing; Vite pulls in `esbuild`. If a later install reports another unreviewed build script, add that package here — never use `dangerouslyAllowAllBuilds`.

- [ ] **Step 6: Write `.nvmrc`**

```
22.12
```

- [ ] **Step 7: Write `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://benpaulsen.tech",
  output: "static",
  compressHTML: true,
});
```

`compressHTML: true` rather than the Astro 7 default of `'jsx'`. The `'jsx'` mode strips whitespace between inline elements, and this design leans heavily on `·`-separated inline mono labels. Task 6 verifies whether `'jsx'` is safe; until then the conservative setting stays.

- [ ] **Step 8: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 9: Replace `.gitignore` contents**

```
node_modules/
dist/
.astro/
.env
.env.production
.DS_Store
.vercel/
test-results/
playwright-report/
```

- [ ] **Step 10: Write a stub page so the build has something to do**

`src/pages/index.astro`:

```astro
---

---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ben.paulsen</title>
  </head>
  <body>
    <p>scaffold</p>
  </body>
</html>
```

- [ ] **Step 11: Install and verify the build**

```bash
pnpm install
pnpm build
```

Expected: install completes with no unreviewed-build-script error, and the build writes `dist/index.html`. If the install fails naming a package with a blocked build script, add it to `allowBuilds` in `pnpm-workspace.yaml` and re-run.

- [ ] **Step 12: Verify the type checker runs**

```bash
pnpm check
```

Expected: `0 errors`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: replace Next.js app with Astro 7 scaffold on pnpm 11"
```

---

## Task 2: Tailwind 4, design tokens, and the base layout

**Files:**

- Create: `src/styles/global.css`, `src/layouts/Base.astro`
- Modify: `astro.config.mjs`, `package.json`, `src/pages/index.astro`

**Interfaces:**

- Consumes: the Astro scaffold from Task 1.
- Produces: `Base.astro`, accepting props `{ title: string; description: string; canonicalPath: string; ogImage?: string }` and a default slot. Every page uses it. Tailwind theme tokens named `canvas`, `panel`, `chip`, `ink`, `accent`, `job`, `edu`, `cap`, plus fonts `display` and `mono`.

- [ ] **Step 1: Add Tailwind 4 and the fonts**

```bash
pnpm add tailwindcss @tailwindcss/vite @fontsource-variable/space-grotesk @fontsource-variable/jetbrains-mono
```

- [ ] **Step 2: Wire the Tailwind Vite plugin into `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://benpaulsen.tech",
  output: "static",
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
});
```

Do **not** install `@astrojs/tailwind` — that integration is legacy and is for Tailwind 3.

- [ ] **Step 3: Write `src/styles/global.css`**

```css
@import "tailwindcss";
@import "@fontsource-variable/space-grotesk";
@import "@fontsource-variable/jetbrains-mono";

@theme {
  --color-canvas: #0b0d11;
  --color-panel: #0e1116;
  --color-chip: #12161c;
  --color-ink: #e6e9ee;
  --color-accent: oklch(0.8 0.16 165);
  --color-job: oklch(0.82 0.14 75);
  --color-edu: oklch(0.75 0.14 300);
  --color-cap: #8d97a8;

  --font-display: "Space Grotesk Variable", system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
}

@layer base {
  :root {
    color-scheme: dark;
  }

  html,
  body {
    height: 100%;
  }

  body {
    margin: 0;
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-display);
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
  }
}

@keyframes bpDash {
  to {
    stroke-dashoffset: -220;
  }
}

@keyframes bpPulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(3.6);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The exact `@fontsource-variable` CSS import paths may differ — check `node_modules/@fontsource-variable/space-grotesk/` for the actual entry file and use what is there.

- [ ] **Step 4: Write `src/layouts/Base.astro`**

```astro
---
import "../styles/global.css";

interface Props {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
}

const { title, description, canonicalPath, ogImage } = Astro.props;
const site = Astro.site ?? new URL("https://benpaulsen.tech");
const canonical = new URL(canonicalPath, site).href;
const og = new URL(ogImage ?? "/og/ben.png", site).href;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={og} />
    <meta name="twitter:card" content="summary_large_image" />
    <slot name="head" />
  </head>
  <body class="bg-canvas text-ink font-display">
    <slot />
  </body>
</html>
```

- [ ] **Step 5: Prove the tokens resolve — temporary check page**

Replace `src/pages/index.astro`:

```astro
---
import Base from "../layouts/Base.astro";
---

<Base title="ben.paulsen" description="scaffold check" canonicalPath="/">
  <p class="text-accent font-mono">accent</p>
  <p class="text-job font-mono">job</p>
  <p class="text-edu font-mono">edu</p>
  <p class="font-display text-ink">display</p>
</Base>
```

- [ ] **Step 6: Run the dev server and confirm rendering**

```bash
pnpm dev
```

Open `http://localhost:4321`. Expected: dark `#0b0d11` background, four lines in the right colours, mono lines in JetBrains Mono and the last in Space Grotesk. If colours render as literal class names, the Tailwind plugin is not wired.

- [ ] **Step 7: Verify build and types**

```bash
pnpm build && pnpm check
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind 4 theme tokens and base layout"
```

---

## Task 3: Content collection — schema and the eleven nodes

**Files:**

- Create: `src/content.config.ts`, `src/content/nodes/{ben,frontend,backend,platform,product,deckos,watchthis,api-workshop,imperfections,gruntify,qut}.md`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: collection `nodes`. Entry `id` is the filename stem. Frontmatter fields exactly as the schema below. Task 4 consumes `wiredTo`, `kind`, `order`, `label`. Task 7 consumes everything else.

- [ ] **Step 1: Write `src/content.config.ts`**

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const nodes = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/nodes" }),
  schema: ({ image }) =>
    z.object({
      label: z.string(),
      kind: z.enum(["core", "capability", "project", "job", "education"]),
      order: z.number(),
      meta: z.string(),
      eyebrow: z.string(),
      pos: z.object({ x: z.number(), y: z.number() }),
      posMobile: z.object({ x: z.number(), y: z.number() }).optional(),
      wiredTo: z.array(z.string()).default([]),
      tags: z.array(z.string()).optional(),
      stack: z.string().optional(),
      stats: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .optional(),
      highlights: z
        .array(z.object({ label: z.string(), body: z.string() }))
        .optional(),
      previous: z
        .array(z.object({ name: z.string(), role: z.string() }))
        .optional(),
      links: z
        .array(
          z.object({
            label: z.string(),
            href: z.string().optional(),
            accent: z.boolean().default(false),
          }),
        )
        .default([]),
      screenshot: image().optional(),
      seo: z.object({ title: z.string(), description: z.string() }),
    }),
});

export const collections = { nodes };
```

`stats`, `highlights` and `previous` extend the schema in the spec — the `ben` panel has a four-tile stat grid, and the `gruntify` panel has three labelled highlights plus a "BEFORE THIS" list. `href` is optional so DeckOS's "live demo (soon)" renders as inert text rather than the design's `href="#"`, which is a dead link to a crawler.

- [ ] **Step 2: Write `src/content/nodes/ben.md`**

```markdown
---
label: ben.paulsen
kind: core
order: 0
meta: CORE
eyebrow: SOFTWARE DEVELOPER · BRISBANE, AU
pos: { x: 0.5, y: 0.5 }
wiredTo: [frontend, backend, platform, product, qut]
stats:
  - { value: "%CAREER_YEARS% yrs", label: SHIPPING SOFTWARE }
  - { value: "2", label: DEGREES, DISTINCTION }
  - { value: "4", label: PROJECTS ON THIS MAP }
  - { value: "3", label: COMPANIES SO FAR }
links:
  - { label: email me, href: "mailto:ben.paulsen4@gmail.com", accent: true }
  - {
      label: linkedin,
      href: "https://www.linkedin.com/in/ben-paulsen-26979b237/",
    }
  - { label: github, href: "https://github.com/benpaulsen4" }
seo:
  title: Ben Paulsen — Software Developer, Brisbane
  description: Software developer in Brisbane, Australia. Platform lead at Gruntify, building with .NET, Angular, React and Azure. Explore my work as a system map.
---

Six years in, with a computer science degree and a business one that I end up using in the same meeting. I build the parts of a system other people have to live in: ideally boring to maintain, and genuinely good to use.

Platform lead at Gruntify by day, building homelab and TV-tracking tools by night. Everything on this map is wired to something I have actually shipped, so start anywhere.
```

`%CAREER_YEARS%` is a substitution token — Task 7 replaces it at render time using `careerYears()` from Task 5. Do not hardcode a number.

- [ ] **Step 3: Write the four capability nodes**

`src/content/nodes/frontend.md`:

```markdown
---
label: frontend
kind: capability
order: 1
meta: CAPABILITY
eyebrow: CAPABILITY · EVERY DAY
pos: { x: 0.5, y: 0.24 }
posMobile: { x: 0.5, y: 0.245 }
tags: [Angular, React, TypeScript, Next.js, RxJS, HTML/CSS, UX design]
seo:
  title: Frontend — Ben Paulsen
  description: Angular in the day job, React and Next at night, TypeScript for both. Frontend work by a Brisbane software developer.
---

The part of the job I care about most. Great UX is the whole point of shipping software, and an elegant front-end implementation is how you keep it that way: clear state, honest loading, components that stay readable a year later. Angular in the day job, React and Next at night, TypeScript for both.
```

`src/content/nodes/backend.md`:

```markdown
---
label: backend
kind: capability
order: 2
meta: CAPABILITY
eyebrow: CAPABILITY · EVERY DAY
pos: { x: 0.78, y: 0.5 }
posMobile: { x: 0.85, y: 0.5 }
tags: [C# / .NET, Node.js, Hono, Postgres, Drizzle, MongoDB, REST]
seo:
  title: Backend — Ben Paulsen
  description: .NET APIs by day, Node and Hono by night. Relational by default, document stores when the shape earns it.
---

A .NET API is where most of my working hours go; Node and Hono when I am building my own. I appreciate an elegant system as much as anyone, but function and practicality win every time: the design that ships, holds up under real load and can be handed over is the better design. Relational by default, document stores when the shape genuinely earns it.
```

`src/content/nodes/platform.md`:

```markdown
---
label: platform
kind: capability
order: 3
meta: CAPABILITY
eyebrow: CAPABILITY · INFRA AS CODE, CI/CD
pos: { x: 0.5, y: 0.76 }
posMobile: { x: 0.5, y: 0.755 }
tags:
  [
    Azure,
    Bicep / ARM,
    Terraform,
    GitHub Actions,
    Azure Pipelines,
    Docker,
    Linux,
  ]
seo:
  title: Platform — Ben Paulsen
  description: Infrastructure as code and pipeline work across Azure and GitHub. Bicep, Terraform, GitHub Actions, Docker and Linux.
---

Years of infrastructure as code and pipeline work across the Azure and GitHub ecosystems: Bicep and Terraform for environments, GitHub Actions and Azure Pipelines for build, test and release, secrets and identity handled properly, and multi-tenant deploys that survive being repeated. I own this end to end at work, from the resource definitions to the release gates.

At home it is plain Linux boxes and Docker. Deploys should be boring and logs should tell the truth; most of DeckOS exists because I wanted that on my own hardware too.
```

`src/content/nodes/product.md`:

```markdown
---
label: product
kind: capability
order: 4
meta: CAPABILITY
eyebrow: CAPABILITY · THE OTHER HALF OF THE DEGREE
pos: { x: 0.22, y: 0.5 }
posMobile: { x: 0.15, y: 0.5 }
tags:
  [Solutions consulting, Discovery, Roadmapping, Support leadership, UI design]
seo:
  title: Product — Ben Paulsen
  description: Solutions consulting, discovery and support leadership — finding out what a client actually needs before anyone writes code.
---

Solutions consulting, discovery, and the unglamorous work of finding out what a client actually needs before anyone writes code. It is the reason my estimates got better and my rewrites got rarer.

I also manage the customer support team, which means every complaint, workaround and confused screenshot lands on my desk first. That is a direct line into product design decisions, and it changes what I choose to build.
```

- [ ] **Step 4: Write the four project nodes**

`src/content/nodes/deckos.md`:

```markdown
---
label: DeckOS
kind: project
order: 1
meta: PROJECT · 2026
eyebrow: PROJECT · APRIL 2026 · SELF-HOSTED
pos: { x: 0.853, y: 0.195 }
posMobile: { x: 0.833, y: 0.122 }
wiredTo: [frontend, backend, platform]
stack: TS · REACT · HONO · DOCKER
links:
  - { label: live demo (soon), accent: true }
  - { label: github →, href: "https://github.com/benpaulsen4/deck-os" }
seo:
  title: DeckOS — Ben Paulsen
  description: Homelab management that leaves Docker visible. Raw compose files with templates and remote hosts, on a stock Ubuntu box. TypeScript, React, Hono.
---

Homelab management that leaves Docker visible. All the power of raw compose files with the convenience of templates and remote hosts: no proprietary config, no whole-OS install, drops onto a stock Ubuntu box.
```

`src/content/nodes/watchthis.md`:

```markdown
---
label: WatchThis
kind: project
order: 2
meta: PROJECT · 2025
eyebrow: PROJECT · NOVEMBER 2025 · SOCIAL
pos: { x: 0.878, y: 0.65 }
posMobile: { x: 0.856, y: 0.745 }
wiredTo: [frontend, backend]
stack: TS · NEXT.JS · DRIZZLE · POSTGRES
links:
  - {
      label: try it out →,
      href: "https://watchthis.benpaulsen.tech/",
      accent: true,
    }
  - { label: github →, href: "https://github.com/benpaulsen4/watch-this" }
seo:
  title: WatchThis — Ben Paulsen
  description: A TV and film tracker built around the people you watch with. TMDB data, shared lists and in-sync watch history. Next.js, Drizzle, Postgres.
---

A TV and film tracker built around the people you watch with. TMDB data underneath, shared lists and in-sync watch history on top, so collaboration is the premise rather than a bolt-on. I watch most things with my partner, and nothing out there was built for that.
```

`src/content/nodes/api-workshop.md`:

```markdown
---
label: API Workshop
kind: project
order: 3
meta: PROJECT · 2025
eyebrow: PROJECT · JUNE 2025 · SCHEMA EDITOR
pos: { x: 0.711, y: 0.877 }
posMobile: { x: 0.644, y: 0.923 }
wiredTo: [frontend, platform]
stack: TS · ANGULAR · RXDB · RAILWAY
links:
  - {
      label: try it out →,
      href: "https://api-workshop.benpaulsen.tech/",
      accent: true,
    }
  - { label: github →, href: "https://github.com/benpaulsen4/api-workshop" }
seo:
  title: API Workshop — Ben Paulsen
  description: A local-first JSON Schema editor, free and open source, built the way a working developer would want it. Angular, RxDB, Railway.
---

I needed an OpenAPI definition one afternoon and found every tool either terrible or expensive. This is the first slice of the answer: a local-first JSON Schema editor, free and open source, built the way a working developer would want it.
```

`src/content/nodes/imperfections.md`:

```markdown
---
label: Imperfections
kind: project
order: 4
meta: PROJECT · 2023
eyebrow: PROJECT · DECEMBER 2023 · TWO DAYS
pos: { x: 0.302, y: 0.873 }
posMobile: { x: 0.289, y: 0.918 }
wiredTo: [frontend]
stack: TS · ANGULAR · RAILWAY · CADDY
links:
  - {
      label: play now →,
      href: "https://imperfections.benpaulsen.tech/",
      accent: true,
    }
  - { label: github →, href: "https://github.com/benpaulsen4/Imperfections" }
seo:
  title: Imperfections — Ben Paulsen
  description: A party game built over a hackathon weekend — the 1980s board game Heartthrob rebuilt with a modern pop-culture deck. Angular, Railway, Caddy.
---

A party game built over a hackathon weekend: the 1980s board game Heartthrob, rebuilt with a modern pop-culture deck. Two days from idea to something people could actually play in a room together, lightweight and cloud-portable, served by Caddy.
```

- [ ] **Step 5: Write the job and education nodes**

`src/content/nodes/gruntify.md`:

```markdown
---
label: Gruntify
kind: job
order: 1
meta: JOB · 2022 → NOW
eyebrow: JOB · 2022 → NOW · PLATFORM LEAD
pos: { x: 0.156, y: 0.208 }
posMobile: { x: 0.156, y: 0.122 }
wiredTo: [frontend, backend, platform, product]
highlights:
  - label: AI FEATURES, DESIGN TO SHIP
    body: Designed and built the product's AI capabilities, from framing what was worth automating for field crews through to the implementation that shipped.
  - label: PLATFORM MODERNISATION
    body: Led modernisation initiatives in direct collaboration with our largest enterprise customers, replacing legacy pieces without interrupting the crews depending on them.
  - label: SUPPORT AND PRODUCT
    body: Manage the customer support team, which puts real user friction straight into product design decisions.
previous:
  - { name: REX Energy, role: Solutions Consultant & DevOps Developer }
  - {
      name: Grey Matta Solutions,
      role: Digital Solutions Consultant & Developer,
    }
seo:
  title: Gruntify — Ben Paulsen
  description: Platform lead at Gruntify, a GIS startup for field work and asset management. .NET services, Angular client and Azure, end to end.
---

A small GIS startup doing field work and asset management for enterprise clients. I lead the platform side, .NET services, Angular client and Azure end to end, and take the consulting half too, shaping the product around how each client actually operates.
```

`src/content/nodes/qut.md`:

```markdown
---
label: QUT
kind: education
order: 1
meta: EDUCATION · 2019–22
eyebrow: EDUCATION · BRISBANE · ORIGIN NODE
pos: { x: 0.124, y: 0.78 }
posMobile: { x: 0.144, y: 0.765 }
stack: CS + BUSINESS · DISTINCTION · 2019–2022
seo:
  title: QUT — Ben Paulsen
  description: Bachelor of Information Technology (Computer Science) and Bachelor of Business (Management), both with distinction, from QUT Brisbane.
---

Bachelor of Information Technology (Computer Science) and Bachelor of Business (Management), both with distinction. Doing them together looked like hedging at the time; it turned out to be the job description.

Final year was a capstone project delivered for a real client: Tanda, the Brisbane workforce management and payroll company behind rostering and time-and-attendance software used across retail and hospitality. Our team built JobHub, a marketplace for short-term internal work inside large organisations, and it was graded 95%.
```

- [ ] **Step 6: Verify the collection parses**

```bash
pnpm build
```

Expected: build succeeds. A Zod error naming a file and field means that file's frontmatter is wrong — fix it rather than loosening the schema.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add nodes content collection with eleven entries"
```

---

## Task 4: Graph derivation (TDD)

**Files:**

- Create: `src/lib/graph.ts`, `tests/graph.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: node data shaped `{ id, label, kind, order, wiredTo }`.
- Produces:

  - `type GraphNode = { id: string; label: string; kind: NodeKind; order: number; wiredTo: string[] }`
  - `type Edge = { a: string; b: string }`
  - `buildEdges(nodes: GraphNode[]): Edge[]`
  - `neighbourIds(nodes: GraphNode[], id: string): string[]`
  - `wiredToLabel(nodes: GraphNode[], id: string): string`
  - `edgeKey(e: Edge): string` → `"a b"`, used as the `data-edge` attribute
  - `assertGraphIntegrity(nodes: GraphNode[]): void` — throws on dangling `wiredTo`

- [ ] **Step 1: Add Vitest**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: Write the failing test**

`tests/graph.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  assertGraphIntegrity,
  buildEdges,
  edgeKey,
  neighbourIds,
  wiredToLabel,
  type GraphNode,
} from "../src/lib/graph";

const nodes: GraphNode[] = [
  {
    id: "ben",
    label: "ben.paulsen",
    kind: "core",
    order: 0,
    wiredTo: ["frontend", "backend", "platform", "product", "qut"],
  },
  {
    id: "frontend",
    label: "frontend",
    kind: "capability",
    order: 1,
    wiredTo: [],
  },
  {
    id: "backend",
    label: "backend",
    kind: "capability",
    order: 2,
    wiredTo: [],
  },
  {
    id: "platform",
    label: "platform",
    kind: "capability",
    order: 3,
    wiredTo: [],
  },
  {
    id: "product",
    label: "product",
    kind: "capability",
    order: 4,
    wiredTo: [],
  },
  {
    id: "deckos",
    label: "DeckOS",
    kind: "project",
    order: 1,
    wiredTo: ["frontend", "backend", "platform"],
  },
  {
    id: "watchthis",
    label: "WatchThis",
    kind: "project",
    order: 2,
    wiredTo: ["frontend", "backend"],
  },
  {
    id: "api-workshop",
    label: "API Workshop",
    kind: "project",
    order: 3,
    wiredTo: ["frontend", "platform"],
  },
  {
    id: "imperfections",
    label: "Imperfections",
    kind: "project",
    order: 4,
    wiredTo: ["frontend"],
  },
  {
    id: "gruntify",
    label: "Gruntify",
    kind: "job",
    order: 1,
    wiredTo: ["frontend", "backend", "platform", "product"],
  },
  { id: "qut", label: "QUT", kind: "education", order: 1, wiredTo: [] },
];

describe("buildEdges", () => {
  it("produces the design's seventeen edges", () => {
    expect(buildEdges(nodes)).toHaveLength(17);
  });

  it("produces no duplicate edges regardless of direction", () => {
    const keys = buildEdges(nodes).map(edgeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("deduplicates an edge declared from both ends", () => {
    const both: GraphNode[] = [
      { id: "a", label: "A", kind: "core", order: 0, wiredTo: ["b"] },
      { id: "b", label: "B", kind: "capability", order: 1, wiredTo: ["a"] },
    ];
    expect(buildEdges(both)).toHaveLength(1);
  });
});

describe("edgeKey", () => {
  it("formats as a space-separated pair for the data-edge attribute", () => {
    expect(edgeKey({ a: "ben", b: "frontend" })).toBe("ben frontend");
  });
});

describe("neighbourIds", () => {
  it("finds neighbours declared from the other end", () => {
    expect(neighbourIds(nodes, "frontend")).toContain("deckos");
  });

  it("finds neighbours declared from this end", () => {
    expect(neighbourIds(nodes, "deckos")).toContain("platform");
  });
});

describe("wiredToLabel", () => {
  it("matches the design for a capability — job first, then projects newest to oldest, core excluded", () => {
    expect(wiredToLabel(nodes, "frontend")).toBe(
      "Gruntify · DeckOS · WatchThis · API Workshop · Imperfections",
    );
  });

  it("matches the design for backend", () => {
    expect(wiredToLabel(nodes, "backend")).toBe(
      "Gruntify · DeckOS · WatchThis",
    );
  });

  it("matches the design for platform", () => {
    expect(wiredToLabel(nodes, "platform")).toBe(
      "Gruntify · DeckOS · API Workshop",
    );
  });

  it("matches the design for product", () => {
    expect(wiredToLabel(nodes, "product")).toBe("Gruntify");
  });

  it("matches the design for a project — capabilities in canonical order", () => {
    expect(wiredToLabel(nodes, "deckos")).toBe("frontend · backend · platform");
  });

  it("matches the design for the job", () => {
    expect(wiredToLabel(nodes, "gruntify")).toBe(
      "frontend · backend · platform · product",
    );
  });

  it("falls back to core when core is the only neighbour", () => {
    expect(wiredToLabel(nodes, "qut")).toBe("ben.paulsen");
  });
});

describe("assertGraphIntegrity", () => {
  it("passes for the real graph", () => {
    expect(() => assertGraphIntegrity(nodes)).not.toThrow();
  });

  it("throws naming the offending id and node", () => {
    const broken: GraphNode[] = [
      { id: "ben", label: "ben", kind: "core", order: 0, wiredTo: ["ghost"] },
    ];
    expect(() => assertGraphIntegrity(broken)).toThrow(/ghost/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm test
```

Expected: FAIL — cannot resolve `../src/lib/graph`.

- [ ] **Step 4: Implement `src/lib/graph.ts`**

```ts
export type NodeKind = "core" | "capability" | "project" | "job" | "education";

export type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  order: number;
  wiredTo: string[];
};

export type Edge = { a: string; b: string };

/** Order the "wired to →" line lists neighbours in. */
const KIND_ORDER: NodeKind[] = [
  "capability",
  "job",
  "project",
  "education",
  "core",
];

export function edgeKey(e: Edge): string {
  return `${e.a} ${e.b}`;
}

export function buildEdges(nodes: GraphNode[]): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];

  for (const node of nodes) {
    for (const target of node.wiredTo) {
      // Undirected: canonicalise the pair so a→b and b→a collapse to one edge.
      const [a, b] = [node.id, target].sort();
      const key = `${a} ${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: node.id, b: target });
    }
  }

  return edges;
}

export function neighbourIds(nodes: GraphNode[], id: string): string[] {
  const out = new Set<string>();
  for (const node of nodes) {
    if (node.id === id) {
      for (const t of node.wiredTo) out.add(t);
    } else if (node.wiredTo.includes(id)) {
      out.add(node.id);
    }
  }
  return [...out];
}

export function wiredToLabel(nodes: GraphNode[], id: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighbours = neighbourIds(nodes, id)
    .map((nid) => byId.get(nid))
    .filter((n): n is GraphNode => n !== undefined);

  const nonCore = neighbours.filter((n) => n.kind !== "core");
  // Education nodes wire only to the core, so fall back rather than render nothing.
  const listed = nonCore.length > 0 ? nonCore : neighbours;

  return listed
    .slice()
    .sort(
      (x, y) =>
        KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) ||
        x.order - y.order,
    )
    .map((n) => n.label)
    .join(" · ");
}

export function assertGraphIntegrity(nodes: GraphNode[]): void {
  const ids = new Set(nodes.map((n) => n.id));
  for (const node of nodes) {
    for (const target of node.wiredTo) {
      if (!ids.has(target)) {
        throw new Error(
          `Node "${node.id}" is wired to "${target}", which does not exist.`,
        );
      }
      if (target === node.id) {
        throw new Error(`Node "${node.id}" is wired to itself.`);
      }
    }
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm test
```

Expected: all pass. If `wiredToLabel` for `frontend` comes back in the wrong order, check `KIND_ORDER` and the `order` values in the fixtures — the design's order is job, then projects newest to oldest.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: derive graph edges and wired-to labels from content"
```

---

## Task 5: Date-derived values (TDD)

**Files:**

- Create: `src/lib/dates.ts`, `tests/dates.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:

  - `CAREER_START = 2020`
  - `careerYears(now?: Date): number`
  - `statusWord(now?: Date): string`
  - `brisbaneParts(now: Date): { hour: number; weekday: boolean }`

- [ ] **Step 1: Write the failing test**

`tests/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CAREER_START, careerYears, statusWord } from "../src/lib/dates";

/** Brisbane is UTC+10 year round. 00:00 UTC = 10:00 Brisbane same day. */
const bris = (isoLocal: string) => new Date(`${isoLocal}+10:00`);

describe("careerYears", () => {
  it("counts from CAREER_START", () => {
    expect(CAREER_START).toBe(2020);
    expect(careerYears(new Date("2026-08-16T00:00:00Z"))).toBe(6);
  });

  it("advances with the year", () => {
    expect(careerYears(new Date("2027-01-01T00:00:00Z"))).toBe(7);
  });
});

describe("statusWord", () => {
  it("sleeps before 7am", () => {
    expect(statusWord(bris("2026-08-17T03:00:00"))).toBe("sleeping");
  });

  it("wakes up between 7 and 8", () => {
    expect(statusWord(bris("2026-08-17T07:30:00"))).toBe("waking up");
  });

  it("works on a weekday between 8 and 5", () => {
    // 2026-08-17 is a Monday.
    expect(statusWord(bris("2026-08-17T10:00:00"))).toBe("working");
  });

  it("does not work on a weekend daytime", () => {
    // 2026-08-15 is a Saturday.
    expect(statusWord(bris("2026-08-15T10:00:00"))).toBe("projecting");
  });

  it("cooks between 5 and 7pm on any day", () => {
    expect(statusWord(bris("2026-08-17T18:00:00"))).toBe("cooking");
    expect(statusWord(bris("2026-08-15T18:00:00"))).toBe("cooking");
  });

  it("projects on a weekday evening and relaxes on a weekend evening", () => {
    expect(statusWord(bris("2026-08-17T20:00:00"))).toBe("projecting");
    expect(statusWord(bris("2026-08-15T20:00:00"))).toBe("relaxing");
  });

  it("fiddles with the homelab after 10pm", () => {
    expect(statusWord(bris("2026-08-17T23:00:00"))).toBe(
      "fiddling with the homelab",
    );
  });

  it("is correct regardless of the caller's own timezone", () => {
    // 22:00 UTC on Sunday is 08:00 Brisbane on Monday — a working hour.
    expect(statusWord(new Date("2026-08-16T22:00:00Z"))).toBe("working");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test dates
```

Expected: FAIL — cannot resolve `../src/lib/dates`.

- [ ] **Step 3: Implement `src/lib/dates.ts`**

```ts
export const CAREER_START = 2020;

const BRISBANE = "Australia/Brisbane";

/**
 * Hour-of-day and weekday-ness in Brisbane, independent of the caller's
 * timezone. Uses Intl rather than a hardcoded UTC+10 offset so this stays
 * correct if Queensland ever adopts daylight saving.
 */
export function brisbaneParts(now: Date): { hour: number; weekday: boolean } {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = fmt.formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const dayPart = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  // "24" is a legitimate en-AU rendering of midnight; normalise it to 0.
  const hour = Number(hourPart) % 24;
  const weekday = !["Sat", "Sun"].includes(dayPart);

  return { hour, weekday };
}

export function careerYears(now: Date = new Date()): number {
  const year = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: BRISBANE,
      year: "numeric",
    }).format(now),
  );
  return year - CAREER_START;
}

/**
 * Time-of-day status shown under the core node.
 *
 * Note vs. the design: its final branch was `weekday ? "fiddling" : "projecting"`,
 * but weekday 08:00–16:59 is caught by the `working` case above, so only weekend
 * hours ever reached it and "fiddling" was unreachable. Collapsed to one value.
 */
export function statusWord(now: Date = new Date()): string {
  const { hour, weekday } = brisbaneParts(now);

  if (hour < 7) return "sleeping";
  if (hour < 8) return "waking up";
  if (weekday && hour < 17) return "working";
  if (hour >= 17 && hour < 19) return "cooking";
  if (hour >= 19 && hour < 22) return weekday ? "projecting" : "relaxing";
  if (hour >= 22) return "fiddling with the homelab";
  return "projecting";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm test
```

Expected: all pass, including the graph tests from Task 4.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Brisbane status word and career year derivation"
```

---

## Task 6: Node adapter and the static map

**Files:**

- Create: `src/lib/nodes.ts`, `src/components/NodeChip.astro`, `src/components/Legend.astro`, `src/components/Map.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**

- Consumes: `graph.ts` (Task 4), the `nodes` collection (Task 3).
- Produces:

  - `type SiteNode` — a collection entry flattened to `{ id, label, kind, order, meta, eyebrow, pos, posMobile, wiredTo, tags?, stack?, stats?, highlights?, previous?, links, screenshot?, seo, body }`
  - `loadNodes(): Promise<SiteNode[]>` — sorted, integrity-asserted
  - `<Map nodes={SiteNode[]} activeId={string} variant={"desktop" | "mobile"} />`

- [ ] **Step 1: Write `src/lib/nodes.ts`**

```ts
import { getCollection } from "astro:content";
import { assertGraphIntegrity, type GraphNode } from "./graph";

export async function loadNodes() {
  const entries = await getCollection("nodes");

  const nodes = entries.map((entry) => ({
    id: entry.id,
    ...entry.data,
    entry,
  }));

  // Stable ordering: core first, then by kind order, then by the node's own order.
  const KIND_RANK = {
    core: 0,
    capability: 1,
    job: 2,
    project: 3,
    education: 4,
  };
  nodes.sort(
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.order - b.order,
  );

  assertGraphIntegrity(nodes as GraphNode[]);
  return nodes;
}

export type SiteNode = Awaited<ReturnType<typeof loadNodes>>[number];
```

Astro 7's `getCollection` returns entries whose `id` is the filename stem. If the returned shape differs, adapt here rather than in components — this module exists to keep collection specifics in one place.

- [ ] **Step 2: Write `src/components/NodeChip.astro`**

```astro
---
import type { SiteNode } from "../lib/nodes";

interface Props {
  node: SiteNode;
  variant: "desktop" | "mobile";
  active: boolean;
}

const { node, variant, active } = Astro.props;
const pos = variant === "mobile" ? (node.posMobile ?? node.pos) : node.pos;
const href = node.id === "ben" ? "/" : `/${node.id}`;

const dotClass = {
  core: "bg-accent",
  capability: "bg-cap",
  project: "bg-accent",
  job: "bg-job",
  education: "bg-edu",
}[node.kind];
---

<a
  href={href}
  data-node={node.id}
  data-kind={node.kind}
  data-active={active ? "" : null}
  class="group bg-chip/96 data-active:border-accent data-[kind=core]:border-accent/50 data-[kind=core]:bg-chip absolute z-3 block -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/13 no-underline transition-[transform,border-color,opacity] duration-300 hover:scale-105 data-dimmed:opacity-32"
  class:list={[variant === "mobile" ? "px-3 py-2" : "px-4 py-3"]}
  style={`left:${pos.x * 100}%;top:${pos.y * 100}%`}
>
  <span class="flex items-center gap-2">
    <span class={`block size-1.5 shrink-0 rounded-full ${dotClass}`}></span>
    <span
      class="font-display font-semibold tracking-tight"
      class:list={[variant === "mobile" ? "text-[11.5px]" : "text-[15px]"]}
      >{node.label}</span
    >
  </span>
  <span
    class="text-ink/38 mt-1 block font-mono font-medium tracking-[0.14em]"
    class:list={[variant === "mobile" ? "text-[7.5px]" : "text-[9.5px]"]}
    >{node.meta}</span
  >
</a>
```

The core node also carries the pulsing dot — Task 9 adds it via CSS on `[data-kind="core"]`, not here.

- [ ] **Step 3: Write `src/components/Legend.astro`**

```astro
---
interface Props {
  variant: "desktop" | "mobile";
}
const { variant } = Astro.props;

const items = [
  { label: "CAPABILITY", dot: "bg-cap" },
  { label: "PROJECT", dot: "bg-accent" },
  { label: "JOB", dot: "bg-job" },
  { label: variant === "mobile" ? "EDU" : "EDUCATION", dot: "bg-edu" },
];
---

<div
  class="text-ink/42 flex items-center font-mono font-medium tracking-[0.1em]"
  class:list={[
    variant === "mobile" ? "gap-3 text-[8.5px]" : "gap-[18px] text-[10.5px]",
  ]}
>
  {
    items.map((item) => (
      <span class="flex items-center gap-[7px]">
        <span class={`block size-1.5 rounded-full ${item.dot}`} />
        {item.label}
      </span>
    ))
  }
</div>
```

- [ ] **Step 4: Write `src/components/Map.astro`**

```astro
---
import { buildEdges, edgeKey, type GraphNode } from "../lib/graph";
import type { SiteNode } from "../lib/nodes";
import Legend from "./Legend.astro";
import NodeChip from "./NodeChip.astro";

interface Props {
  nodes: SiteNode[];
  activeId: string;
  variant: "desktop" | "mobile";
}

const { nodes, activeId, variant } = Astro.props;
const mobile = variant === "mobile";

const edges = buildEdges(nodes as GraphNode[]);
const byId = new Map(nodes.map((n) => [n.id, n]));
const posOf = (id: string) => {
  const n = byId.get(id)!;
  return mobile ? (n.posMobile ?? n.pos) : n.pos;
};

// The SVG stretches to its container (preserveAspectRatio="none"), so viewBox
// units and the chips' percentage offsets stay aligned at any size.
const VW = 1000;
const VH = 1000;
---

<div
  id={mobile ? "bpGM" : "bpG"}
  data-map
  class="relative overflow-hidden bg-[radial-gradient(rgba(255,255,255,.05)_1px,transparent_1px)]"
  class:list={[
    mobile ? "h-[392px] touch-none bg-[size:28px_28px]" : "bg-[size:34px_34px]",
  ]}
>
  <div
    id={mobile ? "bpGMinner" : undefined}
    data-map-inner
    class="absolute inset-0 origin-center"
  >
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      class="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        class="text-ink/20 [stroke-dasharray:5_7] motion-safe:[animation:bpDash_24s_linear_infinite]"
        stroke-width={mobile ? 1.1 : 1.3}
      >
        {
          edges.map((e) => {
            const a = posOf(e.a);
            const b = posOf(e.b);
            return (
              <line
                data-edge={edgeKey(e)}
                x1={a.x * VW}
                y1={a.y * VH}
                x2={b.x * VW}
                y2={b.y * VH}
              />
            );
          })
        }
      </g>
    </svg>

    {
      nodes.map((node) => (
        <NodeChip node={node} variant={variant} active={node.id === activeId} />
      ))
    }
  </div>

  {
    !mobile && (
      <>
        <p class="text-ink/34 absolute top-[22px] left-[26px] z-4 m-0 font-mono text-[11px] font-medium tracking-[0.16em]">
          SYSTEM MAP · HOVER TO TRACE · CLICK TO OPEN
        </p>
        <div class="absolute bottom-[22px] left-[26px] z-4">
          <Legend variant="desktop" />
        </div>
        <p class="text-ink/28 absolute right-[26px] bottom-[22px] z-4 m-0 font-mono text-[10.5px]">
          {nodes.length} nodes · {edges.length} edges · uptime{" "}
          <span data-career-years />
          yrs
        </p>
      </>
    )
  }
</div>
```

Note the counts are `{nodes.length}` and `{edges.length}` — never the literals 11 and 17.

- [ ] **Step 5: Render the map on the index page**

Replace `src/pages/index.astro`:

```astro
---
import Base from "../layouts/Base.astro";
import Map from "../components/Map.astro";
import { loadNodes } from "../lib/nodes";

const nodes = await loadNodes();
---

<Base
  title="Ben Paulsen — Software Developer, Brisbane"
  description="Software developer in Brisbane, Australia."
  canonicalPath="/"
>
  <main class="h-screen">
    <Map nodes={nodes} activeId="ben" variant="desktop" />
  </main>
</Base>
```

- [ ] **Step 6: Verify visually**

```bash
pnpm dev
```

Expected at `http://localhost:4321`: a dark dotted canvas, eleven chips in the design's arrangement (core centred, four capabilities on the axes, projects lower-right and lower-left, Gruntify upper-left, QUT lower-left), and seventeen dashed lines connecting them. Compare against the desktop mock. Chips must sit on the line endpoints — if they float off, the `VW`/`VH` scaling and the percentage offsets have diverged.

- [ ] **Step 7: Check whether `compressHTML: 'jsx'` is safe**

Temporarily set `compressHTML: "jsx"` in `astro.config.mjs`, run `pnpm build`, and inspect `dist/index.html` for a chip's `meta` line and the counts line.

- If the `·` separators keep their surrounding spaces, keep `'jsx'` and note it in the commit message.
- If any spacing collapses (e.g. `PROJECT·2026`), revert to `compressHTML: true`.

This is the risk flagged in the spec; resolve it now rather than at review.

- [ ] **Step 8: Verify build and types**

```bash
pnpm build && pnpm check && pnpm test
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: render the static system map from derived graph data"
```

---

## Task 7: Detail panels

**Files:**

- Create: `src/components/Panel.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**

- Consumes: `SiteNode` (Task 6), `wiredToLabel` (Task 4), `careerYears` (Task 5).
- Produces: `<Panel node={SiteNode} nodes={SiteNode[]} active={boolean} />`. Renders the node's prose body via `render(entry)`.

**Panel takes no `variant` prop**, unlike `Map` and `Legend`. The map renders twice (desktop and mobile markup, CSS shows one) because its node positions genuinely differ. Panels render **once** — duplicating eleven panels of prose would double the page weight and give crawlers and screen readers two copies of every sentence. So the panel's mobile/desktop differences are responsive Tailwind utilities, mobile-first with `md:` for the wider layout.

- [ ] **Step 1: Write `src/components/Panel.astro`**

```astro
---
import { render } from "astro:content";
import { Image } from "astro:assets";
import { wiredToLabel, type GraphNode } from "../lib/graph";
import { careerYears } from "../lib/dates";
import type { SiteNode } from "../lib/nodes";

interface Props {
  node: SiteNode;
  nodes: SiteNode[];
  active: boolean;
}

const { node, nodes, active } = Astro.props;
const { Content } = await render(node.entry);

const wired = wiredToLabel(nodes as GraphNode[], node.id);
const years = careerYears();

const eyebrowColour = {
  core: "text-accent",
  capability: "text-ink/45",
  project: "text-accent",
  job: "text-job",
  education: "text-edu",
}[node.kind];

const stats = node.stats?.map((s) => ({
  ...s,
  value: s.value.replace("%CAREER_YEARS%", String(years)),
}));
---

<article
  data-panel={node.id}
  data-active={active ? "" : null}
  inert={active ? undefined : true}
  class="absolute inset-0 translate-y-2.5 overflow-auto px-5 pt-[18px] pb-[26px] opacity-0 transition-[opacity,transform] duration-[380ms] data-active:translate-y-0 data-active:opacity-100 md:px-[30px] md:pt-0 md:pb-6"
>
  <h1
    class="font-display m-0 text-[21px] font-bold tracking-[-0.03em] md:text-[30px]"
  >
    {node.label}
  </h1>
  <p
    class={`mt-[7px] mb-0 font-mono text-[10px] font-medium tracking-[0.12em] md:text-[11.5px] ${eyebrowColour}`}
  >
    {node.eyebrow}
  </p>

  {
    node.screenshot && (
      <Image
        src={node.screenshot}
        alt={`${node.label} screenshot`}
        widths={[400, 800]}
        sizes="(max-width: 900px) 90vw, 380px"
        class="mt-[18px] h-[132px] w-full rounded-[10px] border border-white/9 object-cover md:h-[158px]"
      />
    )
  }

  <div
    class="prose-panel font-display text-ink/70 mt-5 text-[14px]/[1.6] md:text-[15px]/[1.62]"
  >
    <Content />
  </div>

  {
    stats && (
      <div class="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-white/8 bg-white/8">
        {stats.map((s) => (
          <div class="bg-panel px-4 py-[14px]">
            <p class="font-display m-0 text-[20px] font-bold">{s.value}</p>
            <p class="text-ink/40 m-0 mt-1 font-mono text-[10px] font-medium tracking-[0.13em]">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    )
  }

  {
    node.tags && (
      <div class="text-ink/80 mt-5 flex flex-wrap gap-2 font-mono text-[12px] font-medium">
        {node.tags.map((tag) => (
          <span class="rounded-lg border border-white/13 px-3 py-[7px]">
            {tag}
          </span>
        ))}
      </div>
    )
  }

  {
    node.highlights && (
      <div class="mt-[22px] flex flex-col gap-[14px]">
        {node.highlights.map((h) => (
          <div>
            <p class="text-accent m-0 font-mono text-[10.5px] font-medium tracking-[0.13em]">
              {h.label}
            </p>
            <p class="font-display text-ink/62 mt-1.5 mb-0 text-[14px]/[1.6]">
              {h.body}
            </p>
          </div>
        ))}
      </div>
    )
  }

  {
    node.previous && (
      <>
        <p class="text-ink/35 mt-6 mb-0 font-mono text-[10.5px] font-medium tracking-[0.14em]">
          BEFORE THIS
        </p>
        <div class="mt-3 flex flex-col gap-px overflow-hidden rounded-[10px] border border-white/8 bg-white/8">
          {node.previous.map((p) => (
            <div class="bg-panel px-4 py-[13px]">
              <p class="font-display m-0 text-[14.5px] font-semibold">
                {p.name}
              </p>
              <p class="text-ink/42 m-0 mt-[3px] font-mono text-[12px]">
                {p.role}
              </p>
            </div>
          ))}
        </div>
      </>
    )
  }

  {
    node.stack && (
      <p class="text-ink/45 mt-[18px] mb-0 font-mono text-[11.5px] font-medium tracking-[0.1em]">
        {node.stack}
      </p>
    )
  }

  {
    node.links.length > 0 && (
      <div class="mt-[18px] flex flex-wrap gap-[18px] font-mono text-[12.5px] font-medium">
        {node.links.map((link) =>
          link.href ? (
            <a
              href={link.href}
              class={
                link.accent
                  ? "text-accent underline underline-offset-[3px]"
                  : "text-ink/60 underline underline-offset-[3px]"
              }
            >
              {link.label}
            </a>
          ) : (
            <span class="text-ink/40">{link.label}</span>
          ),
        )}
      </div>
    )
  }

  {
    wired && (
      <p class="text-ink/40 mt-[22px] mb-0 font-mono text-[12.5px]">
        wired to → {wired}
      </p>
    )
  }
</article>

<style>
  .prose-panel :global(p) {
    margin: 0 0 0.875rem;
    text-wrap: pretty;
  }
  .prose-panel :global(p:last-child) {
    margin-bottom: 0;
  }
  .prose-panel :global(p + p) {
    color: color-mix(in oklab, var(--color-ink) 50%, transparent);
  }
</style>
```

The `ben` panel's contact links use the pill treatment rather than underlined text; that difference is handled by Task 9's CSS on `[data-panel="ben"]`, keeping this component single-purpose.

- [ ] **Step 2: Render panels alongside the map**

Replace `src/pages/index.astro`:

```astro
---
import Base from "../layouts/Base.astro";
import Map from "../components/Map.astro";
import Panel from "../components/Panel.astro";
import { loadNodes } from "../lib/nodes";

const nodes = await loadNodes();
---

<Base
  title="Ben Paulsen — Software Developer, Brisbane"
  description="Software developer in Brisbane, Australia."
  canonicalPath="/"
>
  <main class="grid h-screen grid-cols-[1fr_440px]">
    <Map nodes={nodes} activeId="ben" variant="desktop" />
    <div class="bg-panel relative min-h-0 border-l border-white/8">
      {
        nodes.map((node) => (
          <Panel node={node} nodes={nodes} active={node.id === "ben"} />
        ))
      }
    </div>
  </main>
</Base>
```

- [ ] **Step 3: Verify all eleven panels render**

```bash
pnpm dev
```

Expected: the `ben` panel is visible with its four stat tiles reading `6 yrs` (computed, not hardcoded), and its "wired to →" line absent (core has no wired-to line in the design — verify against the mock; if the core panel should show one, it will read `frontend · backend · platform · product · qut`).

In devtools, confirm the other ten `<article data-panel="...">` elements exist in the DOM with `inert` set. This is what makes the site readable without JS.

- [ ] **Step 4: Verify build, types and tests**

```bash
pnpm build && pnpm check && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: render all eleven detail panels as static HTML"
```

---

## Task 8: Header and routing

**Files:**

- Create: `src/components/Header.astro`, `src/pages/[node].astro`
- Modify: `src/pages/index.astro`

**Interfaces:**

- Consumes: `loadNodes` (Task 6), `Map` (Task 6), `Panel` (Task 7).
- Produces: eleven routes. `[node].astro` exports `getStaticPaths()` yielding `{ params: { node: id }, props: { activeId: id } }` for every node except `ben`.

- [ ] **Step 1: Write `src/components/Header.astro`**

```astro
---
const links = [
  { label: "email", href: "mailto:ben.paulsen4@gmail.com" },
  { label: "github", href: "https://github.com/benpaulsen4" },
  {
    label: "linkedin",
    href: "https://www.linkedin.com/in/ben-paulsen-26979b237/",
  },
];
---

<header
  class="flex h-16 flex-none items-center justify-between border-b border-white/7 px-7 max-md:h-auto max-md:flex-col max-md:items-start max-md:gap-2 max-md:px-5 max-md:pt-4 max-md:pb-3"
>
  <div
    class="flex items-center gap-3.5 max-md:flex-col max-md:items-start max-md:gap-0.5"
  >
    <a
      href="/"
      class="font-display text-ink text-base font-bold tracking-[-0.02em] no-underline"
      >ben.paulsen</a
    >
    <span
      class="text-ink/38 font-mono text-[10.5px] font-medium tracking-[0.14em]"
    >
      SOFTWARE DEVELOPER · BRISBANE AU
    </span>
  </div>
  <div
    class="flex items-center gap-[22px] max-md:w-full max-md:justify-between"
  >
    <span
      class="text-accent font-mono text-[11px] font-medium tracking-[0.12em]"
    >
      OPEN TO INTERESTING WORK
    </span>
    <nav
      class="flex gap-4 font-mono text-[12px] font-medium"
      aria-label="Contact"
    >
      {
        links.map((link) => (
          <a
            href={link.href}
            class="text-ink/72 decoration-ink/35 underline underline-offset-[3px]"
          >
            {link.label}
          </a>
        ))
      }
    </nav>
  </div>
</header>
```

- [ ] **Step 2: Extract the shared page body so both routes render identically**

Create `src/components/Screen.astro`:

```astro
---
import Header from "./Header.astro";
import Map from "./Map.astro";
import Panel from "./Panel.astro";
import type { SiteNode } from "../lib/nodes";

interface Props {
  nodes: SiteNode[];
  activeId: string;
}

const { nodes, activeId } = Astro.props;
---

<div class="flex h-dvh flex-col overflow-hidden">
  <Header />

  <div
    class="grid min-h-0 flex-1 grid-cols-[1fr_440px] max-md:flex max-md:flex-col"
  >
    <nav class="relative max-md:flex-none" aria-label="System map">
      <div class="h-full max-md:hidden">
        <Map nodes={nodes} activeId={activeId} variant="desktop" />
      </div>
      <div class="hidden max-md:block">
        <Map nodes={nodes} activeId={activeId} variant="mobile" />
      </div>
    </nav>

    <div
      class="bg-panel relative min-h-0 border-l border-white/8 max-md:flex-1 max-md:border-t max-md:border-l-0"
    >
      {
        nodes.map((node) => (
          <Panel node={node} nodes={nodes} active={node.id === activeId} />
        ))
      }
    </div>
  </div>
</div>
```

Both `Map` variants render; CSS shows one. This keeps the DOM identical across routes, which is what lets Task 9's island work without knowing which route it is on.

- [ ] **Step 3: Rewrite `src/pages/index.astro` to use it**

```astro
---
import Base from "../layouts/Base.astro";
import Screen from "../components/Screen.astro";
import { loadNodes } from "../lib/nodes";

const nodes = await loadNodes();
const ben = nodes.find((n) => n.id === "ben")!;
---

<Base
  title={ben.seo.title}
  description={ben.seo.description}
  canonicalPath="/"
  ogImage="/og/ben.png"
>
  <Screen nodes={nodes} activeId="ben" />
</Base>
```

- [ ] **Step 4: Write `src/pages/[node].astro`**

```astro
---
import type { GetStaticPaths } from "astro";
import Base from "../layouts/Base.astro";
import Screen from "../components/Screen.astro";
import { loadNodes } from "../lib/nodes";

export const getStaticPaths = (async () => {
  const nodes = await loadNodes();
  return nodes
    .filter((node) => node.id !== "ben")
    .map((node) => ({
      params: { node: node.id },
      props: { activeId: node.id },
    }));
}) satisfies GetStaticPaths;

const { activeId } = Astro.props;
const nodes = await loadNodes();
const active = nodes.find((n) => n.id === activeId)!;
---

<Base
  title={active.seo.title}
  description={active.seo.description}
  canonicalPath={`/${active.id}`}
  ogImage={`/og/${active.id}.png`}
>
  <Screen nodes={nodes} activeId={activeId} />
</Base>
```

`getStaticPaths()` must not touch the `Astro` object in Astro 7 — note it reads nothing from it. If a canonical URL is ever needed inside it, use `import.meta.env.SITE`.

- [ ] **Step 5: Verify all eleven routes build**

```bash
pnpm build
ls dist
```

Expected in `dist/`: `index.html` plus directories `frontend/`, `backend/`, `platform/`, `product/`, `deckos/`, `watchthis/`, `api-workshop/`, `imperfections/`, `gruntify/`, `qut/`, each containing an `index.html`.

- [ ] **Step 6: Verify a mirror route serves the right panel active**

```bash
pnpm preview
```

Visit `http://localhost:4321/watchthis`. Expected: the WatchThis panel is the visible one, its chip is accent-bordered, and the page title is "WatchThis — Ben Paulsen". This must be true with JavaScript disabled — turn JS off in devtools and reload to confirm.

- [ ] **Step 7: Verify build, types and tests**

```bash
pnpm build && pnpm check && pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add header and eleven prerendered node routes"
```

---

## Task 9: The map island — tracing, selection, history, status

**Files:**

- Create: `src/scripts/map.ts`, `src/scripts/status.ts`
- Modify: `src/components/Screen.astro`, `src/styles/global.css`

**Interfaces:**

- Consumes: DOM produced by Tasks 6–8 — `[data-map]`, `[data-node]`, `[data-edge]`, `[data-panel]`, `[data-status]`, `[data-career-years]`.
- Produces: `initMap()` and `initStatus()`, both called from a module script in `Screen.astro`.

- [ ] **Step 1: Add the state CSS to `src/styles/global.css`**

Append:

```css
@layer components {
  /* Edge and node trace states. The island sets only these attributes. */
  [data-edge][data-traced] {
    stroke: var(--color-accent);
    stroke-width: 2;
    opacity: 1;
  }
  [data-edge][data-dimmed] {
    opacity: 0.22;
  }
  [data-node][data-dimmed] {
    opacity: 0.32;
  }

  /* Pulsing ring on the core node. */
  [data-node][data-kind="core"]::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 0.9rem;
    width: 7px;
    height: 7px;
    margin-top: -0.55rem;
    border-radius: 9999px;
    background: var(--color-accent);
    pointer-events: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    [data-node][data-kind="core"]::after {
      animation: bpPulse 2.6s ease-out infinite;
    }
  }

  /* The ben panel's contact links are pills, not underlined text. */
  [data-panel="ben"] a[href^="mailto:"] {
    border-radius: 9999px;
    background: var(--color-accent);
    padding: 0.625rem 1.0625rem;
    color: var(--color-canvas);
    text-decoration: none;
  }
  [data-panel="ben"] a:not([href^="mailto:"]) {
    border-radius: 9999px;
    border: 1px solid rgb(255 255 255 / 0.18);
    padding: 0.625rem 1.0625rem;
    color: var(--color-ink);
    text-decoration: none;
  }
}
```

- [ ] **Step 2: Write `src/scripts/status.ts`**

```ts
import { careerYears, statusWord } from "../lib/dates";

const TICK_MS = 60_000;

export function initStatus(): void {
  const render = () => {
    const word = statusWord();
    for (const el of document.querySelectorAll<HTMLElement>("[data-status]")) {
      el.textContent =
        el.dataset.status === "short"
          ? `currently ${word}`
          : `brisbane · currently ${word}`;
    }
  };

  for (const el of document.querySelectorAll<HTMLElement>(
    "[data-career-years]",
  )) {
    el.textContent = String(careerYears());
  }

  render();
  window.setInterval(render, TICK_MS);
}
```

- [ ] **Step 3: Write `src/scripts/map.ts`**

```ts
type Cleanup = () => void;

const PANEL_SELECTOR = "[data-panel]";
const NODE_SELECTOR = "[data-node]";
const EDGE_SELECTOR = "[data-edge]";

function pathFor(id: string): string {
  return id === "ben" ? "/" : `/${id}`;
}

function idFor(path: string): string {
  const clean = path.replace(/\/+$/, "");
  return clean === "" ? "ben" : clean.slice(1);
}

export function initMap(): Cleanup {
  const nodes = [...document.querySelectorAll<HTMLElement>(NODE_SELECTOR)];
  const edges = [...document.querySelectorAll<SVGLineElement>(EDGE_SELECTOR)];
  const panels = [...document.querySelectorAll<HTMLElement>(PANEL_SELECTOR)];
  if (nodes.length === 0 || panels.length === 0) return () => {};

  const edgePairs = new Map(
    edges.map((edge) => [edge, (edge.dataset.edge ?? "").split(" ")]),
  );

  let current = idFor(window.location.pathname);

  /** Highlight the edges touching `id`, dim the rest. `null` clears. */
  const trace = (id: string | null) => {
    for (const edge of edges) {
      const pair = edgePairs.get(edge) ?? [];
      const on = id === null || pair.includes(id);
      edge.toggleAttribute("data-traced", id !== null && on);
      edge.toggleAttribute("data-dimmed", !on);
    }

    for (const node of nodes) {
      const nodeId = node.dataset.node ?? "";
      const related =
        id === null ||
        nodeId === id ||
        edges.some((edge) => {
          const pair = edgePairs.get(edge) ?? [];
          return pair.includes(id) && pair.includes(nodeId);
        });
      node.toggleAttribute("data-dimmed", !related);
    }
  };

  const select = (id: string, { push }: { push: boolean }) => {
    current = id;

    for (const panel of panels) {
      const on = panel.dataset.panel === id;
      panel.toggleAttribute("data-active", on);
      panel.toggleAttribute("inert", !on);
      if (on) panel.scrollTop = 0;
    }

    for (const node of nodes) {
      node.toggleAttribute("data-active", node.dataset.node === id);
    }

    if (push) history.pushState({ id }, "", pathFor(id));
    trace(id === "ben" ? null : id);
  };

  const onClick = (event: MouseEvent) => {
    // Let the browser handle modified clicks — new tab, new window, download.
    if (event.defaultPrevented) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;

    const node = (event.target as Element | null)?.closest<HTMLElement>(
      NODE_SELECTOR,
    );
    if (!node) return;

    // A pan gesture on mobile ends in a click; ignore it.
    const inner = node.closest<HTMLElement>("[data-map-inner]");
    if (inner?.dataset.dragged === "1") {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    select(node.dataset.node ?? "ben", { push: true });
  };

  const onEnter = (event: PointerEvent) => {
    const node = (event.target as Element | null)?.closest<HTMLElement>(
      NODE_SELECTOR,
    );
    if (!node || event.pointerType !== "mouse") return;
    trace(node.dataset.node === "ben" ? null : (node.dataset.node ?? null));
  };

  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    trace(current === "ben" ? null : current);
  };

  const onPop = () => select(idFor(window.location.pathname), { push: false });

  document.addEventListener("click", onClick);
  document.addEventListener("pointerover", onEnter);
  document.addEventListener("pointerout", onLeave);
  window.addEventListener("popstate", onPop);

  // Sync in-memory state with the server-rendered active panel.
  select(current, { push: false });
  history.replaceState({ id: current }, "", pathFor(current));

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("pointerover", onEnter);
    document.removeEventListener("pointerout", onLeave);
    window.removeEventListener("popstate", onPop);
  };
}
```

- [ ] **Step 4: Mount both modules in `src/components/Screen.astro`**

Append at the bottom of the file:

```astro
<script>
  import { initMap } from "../scripts/map";
  import { initStatus } from "../scripts/status";

  initMap();
  initStatus();
</script>
```

Astro bundles and hashes this automatically; no `is:inline`, and no `client:*` directive (that is for framework components).

- [ ] **Step 5: Add the status element to the core node chip**

In `src/components/NodeChip.astro`, replace the `node.meta` span for the core node only. Change the meta block to:

```astro
{
  node.kind === "core" ? (
    <span
      data-status={variant === "mobile" ? "short" : ""}
      class="text-ink/45 mt-1.5 block font-mono"
      class:list={[variant === "mobile" ? "text-[8.5px]" : "text-[11.5px]"]}
    >
      {variant === "mobile"
        ? "currently working"
        : "brisbane · currently working"}
    </span>
  ) : (
    <span
      class="text-ink/38 mt-1 block font-mono font-medium tracking-[0.14em]"
      class:list={[variant === "mobile" ? "text-[7.5px]" : "text-[9.5px]"]}
    >
      {node.meta}
    </span>
  )
}
```

The server-rendered fallback text means the line is never empty before the island runs.

- [ ] **Step 6: Verify interaction by hand**

```bash
pnpm dev
```

Check each of these:

- Hovering a node highlights its edges in accent and dims unrelated nodes.
- Clicking WatchThis swaps the panel **without a page reload** and the address bar reads `/watchthis`.
- Browser back returns to `/` with the ben panel.
- Middle-clicking a node opens it in a new tab.
- Tab moves focus between node chips with a visible accent focus ring; Enter opens one.
- The core node's status line reads a plausible Brisbane-time word.
- The desktop footer reads `11 nodes · 17 edges · uptime 6 yrs`.

- [ ] **Step 7: Verify build, types and tests**

```bash
pnpm build && pnpm check && pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add map interaction island with history routing and status ticker"
```

---

## Task 10: Mobile pan and zoom

**Files:**

- Create: `src/scripts/panzoom.ts`
- Modify: `src/components/Map.astro`, `src/components/Screen.astro`

**Interfaces:**

- Consumes: `#bpGM` (mobile map host) and `#bpGMinner` (transformed layer) from Task 6.
- Produces: `initPanZoom(): void`. Sets `data-dragged="1"` on the inner element during a drag so Task 9's click handler can distinguish a pan from a tap.

- [ ] **Step 1: Add the zoom controls and hint to `src/components/Map.astro`**

Inside the map container, in the `mobile` branch (add an `{ mobile && (...) }` block mirroring the desktop one):

```astro
{
  mobile && (
    <>
      <p class="text-ink/30 pointer-events-none absolute top-2.5 left-4 z-6 m-0 font-mono text-[8.5px] font-medium tracking-[0.12em]">
        DRAG TO PAN · PINCH TO ZOOM
      </p>
      <div class="absolute right-3 bottom-2.5 z-6 flex gap-1.5">
        <button
          type="button"
          data-zoom="out"
          aria-label="Zoom out"
          class="bg-canvas/82 text-ink size-[30px] rounded-lg border border-white/16 font-mono text-[15px] font-medium"
        >
          −
        </button>
        <button
          type="button"
          data-zoom="reset"
          aria-label="Fit map"
          class="bg-canvas/82 text-ink h-[30px] rounded-lg border border-white/16 px-2.5 font-mono text-[9px] font-medium tracking-[0.1em]"
        >
          FIT
        </button>
        <button
          type="button"
          data-zoom="in"
          aria-label="Zoom in"
          class="bg-canvas/82 text-ink size-[30px] rounded-lg border border-white/16 font-mono text-[15px] font-medium"
        >
          +
        </button>
      </div>
    </>
  )
}
```

Also set the initial transform on the mobile inner element so the map starts fitted — add `style={mobile ? "transform:scale(0.82)" : undefined}` to the `[data-map-inner]` div.

- [ ] **Step 2: Write `src/scripts/panzoom.ts`**

```ts
const FIT_SCALE = 0.82;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.4;
const DRAG_THRESHOLD_PX = 6;

export function initPanZoom(): void {
  const host = document.getElementById("bpGM");
  const inner = document.getElementById("bpGMinner");
  if (!host || !inner) return;

  let scale = FIT_SCALE;
  let tx = 0;
  let ty = 0;

  const points = new Map<number, { x: number; y: number }>();
  let panBase: { x: number; y: number; tx: number; ty: number } | null = null;
  let pinchBase: { distance: number; scale: number } | null = null;
  let moved = 0;

  const apply = () => {
    inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  const clamp = (v: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));

  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const rect = host.getBoundingClientRect();
    const ox = clientX - rect.left - rect.width / 2;
    const oy = clientY - rect.top - rect.height / 2;
    const next = clamp(scale * factor);
    const ratio = next / scale;
    tx = ox - (ox - tx) * ratio;
    ty = oy - (oy - ty) * ratio;
    scale = next;
    apply();
  };

  const distance = () => {
    const [a, b] = [...points.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  host.addEventListener("pointerdown", (event: PointerEvent) => {
    // Never capture the zoom buttons.
    if ((event.target as Element).closest("[data-zoom]")) return;

    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved = 0;

    if (points.size === 1) {
      panBase = { x: event.clientX, y: event.clientY, tx, ty };
      pinchBase = null;
    } else if (points.size === 2) {
      pinchBase = { distance: distance(), scale };
      panBase = null;
    }

    host.setPointerCapture(event.pointerId);
  });

  host.addEventListener("pointermove", (event: PointerEvent) => {
    if (!points.has(event.pointerId)) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (points.size === 1 && panBase) {
      const dx = event.clientX - panBase.x;
      const dy = event.clientY - panBase.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      tx = panBase.tx + dx;
      ty = panBase.ty + dy;
      apply();
    } else if (points.size === 2 && pinchBase && pinchBase.distance > 0) {
      moved = DRAG_THRESHOLD_PX + 1;
      scale = clamp(pinchBase.scale * (distance() / pinchBase.distance));
      apply();
    }
  });

  const endPointer = (event: PointerEvent) => {
    points.delete(event.pointerId);
    if (points.size === 0) {
      panBase = null;
      pinchBase = null;
    }

    // Flag a drag so the click handler ignores the click that follows it.
    inner.dataset.dragged = moved > DRAG_THRESHOLD_PX ? "1" : "";
    window.setTimeout(() => {
      inner.dataset.dragged = "";
    }, 60);
  };

  host.addEventListener("pointerup", endPointer);
  host.addEventListener("pointercancel", endPointer);

  host.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 1.12 : 0.89, event.clientX, event.clientY);
    },
    { passive: false },
  );

  for (const button of host.querySelectorAll<HTMLElement>("[data-zoom]")) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const rect = host.getBoundingClientRect();
      const kind = button.dataset.zoom;

      if (kind === "reset") {
        scale = FIT_SCALE;
        tx = 0;
        ty = 0;
        apply();
      } else {
        zoomAt(
          kind === "in" ? 1.2 : 0.83,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
      }
    });
  }

  apply();
}
```

- [ ] **Step 3: Mount it in `src/components/Screen.astro`**

```astro
<script>
  import { initMap } from "../scripts/map";
  import { initPanZoom } from "../scripts/panzoom";
  import { initStatus } from "../scripts/status";

  initMap();
  initPanZoom();
  initStatus();
</script>
```

- [ ] **Step 4: Verify on a mobile viewport**

```bash
pnpm dev
```

In devtools, switch to an iPhone-sized viewport (393×852) and reload. Check:

- The layout stacks: header, 392px map, legend strip, scrolling panel.
- Dragging the map pans it; the drag does **not** open a node.
- Tapping a node opens it.
- `+`, `−` and `FIT` change the zoom, and `FIT` returns to the initial framing.
- Node chips use the mobile positions — compare against the mobile mock.

- [ ] **Step 5: Add the mobile legend strip to `Screen.astro`**

Between the mobile map and the panel container:

```astro
<div class="hidden border-y border-white/7 px-5 py-2.5 max-md:block">
  <Legend variant="mobile" />
</div>
```

Import `Legend` at the top of `Screen.astro`.

- [ ] **Step 6: Verify build, types and tests**

```bash
pnpm build && pnpm check && pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add mobile pan and pinch zoom to the map"
```

---

## Task 11: Assets — screenshots, favicon, and the great deletion

**Files:**

- Create: `src/assets/projects/{deckos,watchthis,api-workshop,imperfections}.png`, `public/favicon.svg`, `public/favicon.ico`
- Delete: everything else under `public/assets/`, `public/favicon.ico` (old)
- Modify: the four project content files, `src/layouts/Base.astro`

**Interfaces:**

- Consumes: the `screenshot: image()` schema field (Task 3), `Panel.astro`'s `<Image>` (Task 7).
- Produces: optimised responsive screenshots on the four project panels.

- [ ] **Step 1: Move the four kept screenshots into `src/assets/`**

```bash
mkdir -p src/assets/projects
git mv public/assets/project-images/deckos.png src/assets/projects/deckos.png
git mv public/assets/project-images/watchthis.png src/assets/projects/watchthis.png
git mv public/assets/project-images/api-workshop.png src/assets/projects/api-workshop.png
git mv public/assets/project-images/imperfections.png src/assets/projects/imperfections.png
```

Files under `src/assets/` go through Astro's image pipeline; files under `public/` are served raw. That is the whole reason for the move.

- [ ] **Step 2: Delete the rest**

```bash
git rm -r public/assets
git rm public/favicon.ico
```

This removes `backdrop.webp` (2.5MB), `profile.png` (2.8MB), all 20 skill icons, all 5 experience logos, and six retired project images including `nocportal.png`, which nothing referenced.

- [ ] **Step 3: Reference the screenshots from the four project content files**

Add to each project's frontmatter — for example in `src/content/nodes/watchthis.md`:

```yaml
screenshot: ../../assets/projects/watchthis.png
```

Do the same for `deckos.md`, `api-workshop.md` and `imperfections.md` with their matching filenames. The path is relative to the content file.

- [ ] **Step 4: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0b0d11"/>
  <text x="16" y="23" text-anchor="middle"
        font-family="Space Grotesk, system-ui, sans-serif"
        font-size="22" font-weight="700"
        fill="oklch(0.8 0.16 165)">b.</text>
</svg>
```

- [ ] **Step 5: Generate the ICO fallback**

```bash
pnpm dlx sharp-cli -i public/favicon.svg -o public/favicon.png resize 32 32
```

If `sharp-cli` is awkward, any 32×32 PNG export of the SVG is fine — commit it as `public/favicon.png` and reference that instead of an `.ico`. Modern browsers use the SVG; the PNG is only a fallback.

- [ ] **Step 6: Link the favicons in `src/layouts/Base.astro`**

Add inside `<head>`:

```astro
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.png" sizes="32x32" />
```

- [ ] **Step 7: Verify the images are optimised**

```bash
pnpm build
```

Inspect `dist/_astro/` for generated `.webp` or `.avif` derivatives of the four screenshots. Then check the built HTML for a project route:

```bash
grep -o 'srcset="[^"]*"' dist/watchthis/index.html | head -1
```

Expected: a `srcset` with multiple widths, not a single raw `.png`. If the raw PNG is being served, the image is still being imported from `public/` rather than `src/assets/`.

- [ ] **Step 8: Verify the repo shrank**

```bash
du -sh public src/assets
```

Expected: `public/` is now a handful of KB; `src/assets/` holds the four screenshots.

- [ ] **Step 9: Verify build, types and tests**

```bash
pnpm build && pnpm check && pnpm test
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: optimise project screenshots and drop 9.5MB of dead assets"
```

---

## Task 12: SEO — JSON-LD, sitemap, OG images, robots

**Files:**

- Create: `src/components/StructuredData.astro`, `src/pages/og/[node].png.ts`, `public/robots.txt`
- Modify: `astro.config.mjs`, `src/layouts/Base.astro`, `src/pages/index.astro`, `src/pages/[node].astro`, `package.json`

**Interfaces:**

- Consumes: `loadNodes` (Task 6).
- Produces: a `<StructuredData nodes activeId />` component emitting one `application/ld+json` graph; eleven PNGs at `/og/<id>.png`; a sitemap at `/sitemap-index.xml`.

- [ ] **Step 1: Add the sitemap integration**

```bash
pnpm add @astrojs/sitemap
```

In `astro.config.mjs`:

```js
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://benpaulsen.tech",
  output: "static",
  compressHTML: true,
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 2: Write `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://benpaulsen.tech/sitemap-index.xml
```

- [ ] **Step 3: Write `src/components/StructuredData.astro`**

```astro
---
import type { SiteNode } from "../lib/nodes";

interface Props {
  nodes: SiteNode[];
  activeId: string;
}

const { nodes, activeId } = Astro.props;
const site = (Astro.site ?? new URL("https://benpaulsen.tech")).origin;

const personId = `${site}/#ben`;
const urlFor = (id: string) => (id === "ben" ? `${site}/` : `${site}/${id}`);

const projects = nodes.filter((n) => n.kind === "project");
const capabilities = nodes.filter((n) => n.kind === "capability");
const job = nodes.find((n) => n.id === "gruntify");
const education = nodes.find((n) => n.id === "qut");

const graph: Record<string, unknown>[] = [
  {
    "@type": "Person",
    "@id": personId,
    name: "Ben Paulsen",
    jobTitle: "Software Developer",
    url: `${site}/`,
    email: "mailto:ben.paulsen4@gmail.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brisbane",
      addressRegion: "QLD",
      addressCountry: "AU",
    },
    knowsAbout: capabilities.map((c) => c.label),
    sameAs: [
      "https://github.com/benpaulsen4",
      "https://www.linkedin.com/in/ben-paulsen-26979b237/",
    ],
    ...(job ? { worksFor: { "@type": "Organization", name: job.label } } : {}),
    ...(education
      ? {
          alumniOf: {
            "@type": "CollegeOrUniversity",
            name: "Queensland University of Technology",
          },
        }
      : {}),
  },
  ...projects.map((project) => ({
    "@type": "SoftwareApplication",
    "@id": `${urlFor(project.id)}#app`,
    name: project.label,
    url: urlFor(project.id),
    description: project.seo.description,
    applicationCategory: "WebApplication",
    author: { "@id": personId },
  })),
];

const active = nodes.find((n) => n.id === activeId);
const mainEntity =
  active && active.kind === "project" ? `${urlFor(active.id)}#app` : personId;

const payload = {
  "@context": "https://schema.org",
  "@graph": [
    ...graph,
    {
      "@type": "WebPage",
      "@id": `${urlFor(activeId)}#page`,
      url: urlFor(activeId),
      name: active?.seo.title,
      description: active?.seo.description,
      mainEntity: { "@id": mainEntity },
    },
  ],
};
---

<script
  type="application/ld+json"
  set:html={JSON.stringify(payload)}
  is:inline
/>
```

- [ ] **Step 4: Slot it into both page routes**

In `src/pages/index.astro` and `src/pages/[node].astro`, add inside `<Base>`:

```astro
<StructuredData slot="head" nodes={nodes} activeId={/* "ben" or activeId */} />
```

Import `StructuredData` in both files. `Base.astro` already has a `<slot name="head" />`.

- [ ] **Step 5: Add the OG image generator**

```bash
pnpm add -D satori sharp @fontsource/space-grotesk
```

`src/pages/og/[node].png.ts`:

```ts
import type { APIRoute, GetStaticPaths } from "astro";
import { readFile } from "node:fs/promises";
import satori from "satori";
import sharp from "sharp";
import { loadNodes } from "../../lib/nodes";

const WIDTH = 1200;
const HEIGHT = 630;

const KIND_COLOUR: Record<string, string> = {
  core: "oklch(0.8 0.16 165)",
  capability: "#8d97a8",
  project: "oklch(0.8 0.16 165)",
  job: "oklch(0.82 0.14 75)",
  education: "oklch(0.75 0.14 300)",
};

export const getStaticPaths = (async () => {
  const nodes = await loadNodes();
  return nodes.map((node) => ({
    params: { node: node.id },
    props: { label: node.label, eyebrow: node.eyebrow, kind: node.kind },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { label, eyebrow, kind } = props as {
    label: string;
    eyebrow: string;
    kind: string;
  };

  const fontData = await readFile(
    "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff",
  );

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0b0d11",
          padding: 80,
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: 26,
                letterSpacing: 4,
                color: KIND_COLOUR[kind],
              },
              children: eyebrow,
            },
          },
          {
            type: "div",
            props: {
              style: { fontSize: 92, color: "#e6e9ee", marginTop: 24 },
              children: label,
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: 30,
                color: "rgba(230,233,238,0.45)",
                marginTop: 40,
              },
              children: "benpaulsen.tech",
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      // Converts glyphs to vector paths, so sharp needs no font support.
      embedFont: true,
      fonts: [
        { name: "Space Grotesk", data: fontData, weight: 700, style: "normal" },
      ],
    },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
```

The exact woff filename under `@fontsource/space-grotesk/files/` may differ — list the directory and use the real 700-weight latin file.

- [ ] **Step 6: Verify the SEO output**

```bash
pnpm build
```

Check each:

```bash
ls dist/og                                   # eleven .png files
cat dist/sitemap-0.xml | grep -c '<loc>'     # eleven URLs
grep -o 'application/ld+json' dist/watchthis/index.html
grep -o '<link rel="canonical"[^>]*>' dist/watchthis/index.html
```

Expected: eleven OG PNGs, eleven sitemap entries, one JSON-LD block per page, and a canonical pointing at `https://benpaulsen.tech/watchthis`.

- [ ] **Step 7: Validate the structured data**

Paste the JSON-LD from `dist/watchthis/index.html` into <https://validator.schema.org/>. Expected: no errors. `SoftwareApplication` may warn about missing `offers`/`aggregateRating` — warnings are acceptable, errors are not.

- [ ] **Step 8: Verify build, types and tests**

```bash
pnpm build && pnpm check && pnpm test
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add JSON-LD, sitemap, robots and generated OG images"
```

---

## Task 13: Redirects and 404

**Files:**

- Create: `vercel.json`, `src/pages/404.astro`

**Interfaces:**

- Consumes: `Base.astro` (Task 2).
- Produces: three permanent redirects and a styled not-found page.

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    { "source": "/projects", "destination": "/deckos", "permanent": true },
    { "source": "/skills", "destination": "/frontend", "permanent": true },
    { "source": "/experience", "destination": "/gruntify", "permanent": true }
  ]
}
```

These are the only routes the old site ever had. `"permanent": true` emits a 301, which is what transfers ranking signal.

- [ ] **Step 2: Write `src/pages/404.astro`**

```astro
---
import Base from "../layouts/Base.astro";
---

<Base
  title="Not found — Ben Paulsen"
  description="That page does not exist."
  canonicalPath="/404"
>
  <main
    class="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
  >
    <p
      class="text-ink/38 m-0 font-mono text-[11px] font-medium tracking-[0.2em]"
    >
      404 · NODE NOT FOUND
    </p>
    <h1 class="font-display m-0 text-[34px] font-bold tracking-[-0.03em]">
      Nothing is wired to this address.
    </h1>
    <a
      href="/"
      class="bg-accent text-canvas mt-2 rounded-full px-[17px] py-2.5 font-mono text-[12px] font-medium no-underline"
    >
      back to the map
    </a>
  </main>
</Base>
```

- [ ] **Step 3: Verify**

```bash
pnpm build && pnpm preview
```

Visit `http://localhost:4321/nonsense`. Expected: the styled 404. Note the redirects are Vercel config and do **not** apply under `pnpm preview` — they are verified on the preview deployment in Task 15.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add old-route redirects and a styled 404"
```

---

## Task 14: Playwright smoke suite

**Files:**

- Create: `playwright.config.ts`, `e2e/map.spec.ts`, `e2e/no-js.spec.ts`, `e2e/mobile.spec.ts`
- Modify: `package.json`, `.gitignore`

**Interfaces:**

- Consumes: the built site.
- Produces: `pnpm e2e`.

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:4321", trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14 Pro"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write `e2e/map.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

const NODES = [
  "frontend",
  "backend",
  "platform",
  "product",
  "deckos",
  "watchthis",
  "api-workshop",
  "imperfections",
  "gruntify",
  "qut",
];

test.describe("map navigation", () => {
  test.skip(({ browserName }, testInfo) => testInfo.project.name !== "desktop");

  for (const id of NODES) {
    test(`clicking ${id} opens its panel and pushes its URL`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator(`[data-node="${id}"]`).first().click();

      await expect(page).toHaveURL(`/${id}`);
      await expect(page.locator(`[data-panel="${id}"]`)).toHaveAttribute(
        "data-active",
        "",
      );
    });
  }

  test("navigating does not reload the page", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      (window as unknown as { __kept: boolean }).__kept = true;
    });

    await page.locator('[data-node="watchthis"]').first().click();
    await expect(page).toHaveURL("/watchthis");

    const kept = await page.evaluate(
      () => (window as unknown as { __kept?: boolean }).__kept === true,
    );
    expect(kept).toBe(true);
  });

  test("back and forward restore the right panel", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-node="deckos"]').first().click();
    await expect(page).toHaveURL("/deckos");

    await page.goBack();
    await expect(page.locator('[data-panel="ben"]')).toHaveAttribute(
      "data-active",
      "",
    );

    await page.goForward();
    await expect(page.locator('[data-panel="deckos"]')).toHaveAttribute(
      "data-active",
      "",
    );
  });

  test("hovering a node traces its edges", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-node="watchthis"]').first().hover();
    await expect(
      page.locator("[data-edge][data-traced]").first(),
    ).toBeVisible();
  });

  test("the footer counts are derived, not hardcoded", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/11 nodes · 17 edges/)).toBeVisible();
  });
});
```

- [ ] **Step 4: Write `e2e/no-js.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

const ROUTES = [
  ["/", "ben"],
  ["/frontend", "frontend"],
  ["/watchthis", "watchthis"],
  ["/gruntify", "gruntify"],
  ["/qut", "qut"],
] as const;

for (const [path, id] of ROUTES) {
  test(`${path} serves its panel active without JavaScript`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.locator(`[data-panel="${id}"]`)).toHaveAttribute(
      "data-active",
      "",
    );
  });
}

test("every panel's copy is in the DOM on every route", async ({ page }) => {
  await page.goto("/qut");
  await expect(page.locator("[data-panel]")).toHaveCount(11);
  await expect(
    page.locator('[data-panel="watchthis"]', {
      hasText: "TMDB data underneath",
    }),
  ).toHaveCount(1);
});

test("node chips are real links without JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-node="deckos"]').first()).toHaveAttribute(
    "href",
    "/deckos",
  );
});
```

- [ ] **Step 5: Write `e2e/mobile.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.describe("mobile map", () => {
  test.skip(({ browserName }, testInfo) => testInfo.project.name !== "mobile");

  test("zoom controls change the map transform", async ({ page }) => {
    await page.goto("/");
    const inner = page.locator("#bpGMinner");

    const before = await inner.evaluate((el) => getComputedStyle(el).transform);
    await page.locator('[data-zoom="in"]').click();
    const after = await inner.evaluate((el) => getComputedStyle(el).transform);
    expect(after).not.toBe(before);

    await page.locator('[data-zoom="reset"]').click();
    const reset = await inner.evaluate((el) => getComputedStyle(el).transform);
    expect(reset).not.toBe(after);
  });

  test("tapping a node opens its panel", async ({ page }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='gruntify']").tap();
    await expect(page).toHaveURL("/gruntify");
    await expect(page.locator('[data-panel="gruntify"]')).toHaveAttribute(
      "data-active",
      "",
    );
  });

  test("dragging the map does not open a node", async ({ page }) => {
    await page.goto("/");
    const node = page.locator("#bpGM [data-node='deckos']");
    const box = (await node.boundingBox())!;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 - 90,
      box.y + box.height / 2 + 40,
      {
        steps: 10,
      },
    );
    await page.mouse.up();

    await expect(page).toHaveURL("/");
  });
});
```

- [ ] **Step 6: Add the ignore entries**

Append to `.gitignore` if not already present:

```
test-results/
playwright-report/
```

- [ ] **Step 7: Run the suite**

```bash
pnpm e2e
```

Expected: all tests pass. A failure in `no-js.spec.ts` means panels are being activated by JS rather than at build time — that is a real regression, not a test problem.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: add Playwright smoke suite for map, no-JS and mobile"
```

---

## Task 15: Toolchain, CI, and documentation

**Files:**

- Create: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.husky/pre-commit`, `.github/workflows/ci.yml`
- Modify: `package.json`, `README.md`
- Delete: `.prettierrc.json` (old, replaced)

**Interfaces:**

- Consumes: everything.
- Produces: a green CI run and accurate documentation.

- [ ] **Step 1: Install the tooling**

```bash
pnpm add -D eslint typescript-eslint eslint-plugin-astro astro-eslint-parser prettier prettier-plugin-astro prettier-plugin-tailwindcss husky lint-staged
```

- [ ] **Step 2: Write `eslint.config.js`**

```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);
```

If `@eslint/js` is not already present as a transitive dependency, add it explicitly.

- [ ] **Step 3: Write `.prettierrc.json`**

```json
{
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }]
}
```

The old file contained only `{}` — this replaces it.

- [ ] **Step 4: Write `.prettierignore`**

```
dist/
.astro/
pnpm-lock.yaml
```

- [ ] **Step 5: Add the scripts and lint-staged config to `package.json`**

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "format": "prettier --write .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,js,astro}": "eslint --fix",
    "*.{ts,js,astro,css,md,json,yaml,yml}": "prettier --write"
  }
```

`"prepare": "husky"` — the old `husky install` form was removed in husky 9 and is part of why the current hooks are stale.

- [ ] **Step 6: Set up the hook**

```bash
pnpm exec husky init
```

Then write `.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

- [ ] **Step 7: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [master]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm check
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

`pnpm/action-setup@v4` reads the version from `packageManager` in `package.json`, so pnpm 11 is used here too.

- [ ] **Step 8: Rewrite `README.md`**

```markdown
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

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

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

## Deployment

Vercel builds `dist/` from `master`. Redirects for the retired routes live in
`vercel.json`. The project requires `ENABLE_EXPERIMENTAL_COREPACK=1` set as an
environment variable so builds use pnpm 11 rather than falling back to pnpm 10.
```

Note the fenced block inside the README needs real backticks when written — the escapes above are only to nest it in this plan.

- [ ] **Step 9: Run the full gate locally**

```bash
pnpm install
pnpm check && pnpm lint && pnpm test && pnpm build && pnpm e2e
```

Expected: all five pass. Fix anything ESLint flags rather than adding disable comments.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: add ESLint, Prettier, husky hooks, CI workflow and rewritten README"
```

---

## Task 16: Deploy verification

**Files:** none — this task verifies the deployed preview.

**Interfaces:**

- Consumes: the complete site.
- Produces: a verified preview deployment ready to merge.

- [ ] **Step 1: Push the branch and open the PR**

```bash
git push -u origin astro-rebuild
gh pr create --base master --title "Rebuild portfolio in Astro 7 as a system map" --body "Implements docs/superpowers/specs/2026-08-16-portfolio-astro-rebuild-design.md"
```

- [ ] **Step 2: Apply the two manual Vercel changes**

These cannot be done from the repo and **must** happen before merge:

1. Project Settings → General → Build & Development Settings: change **Framework Preset** from Next.js to **Astro**.
2. Project Settings → Environment Variables: add `ENABLE_EXPERIMENTAL_COREPACK` = `1`.

- [ ] **Step 3: Confirm the build used pnpm 11**

Open the preview deployment's build logs and find the install step. Expected: pnpm 11.22.0. If it reports pnpm 10, the Corepack environment variable did not take — fix it and redeploy before going further.

- [ ] **Step 4: Verify the redirects on the preview URL**

```bash
curl -sSI https://<preview-url>/projects   | grep -iE 'HTTP/|location'
curl -sSI https://<preview-url>/skills     | grep -iE 'HTTP/|location'
curl -sSI https://<preview-url>/experience | grep -iE 'HTTP/|location'
```

Expected: `308` or `301` with `location: /deckos`, `/frontend`, `/gruntify` respectively. Vercel emits 308 for permanent redirects, which preserves method and passes ranking signal the same way — that is fine.

- [ ] **Step 5: Run Lighthouse against the preview**

Run a Lighthouse audit on the preview URL for both mobile and desktop. Record the four scores in a PR comment. Performance and SEO should both be strong given the site is static with ~3KB of JS; investigate anything below 95 rather than accepting it.

- [ ] **Step 6: Click through the preview**

- All eleven routes load directly and show the right panel.
- The map behaves as designed on a real phone, not just an emulated viewport.
- OG previews render — paste the preview URL into a Slack or Discord message and confirm the card shows the generated image.

- [ ] **Step 7: Merge**

Once CI is green, the preview is verified and both Vercel settings are applied, merge to `master` and confirm the production deployment.

---

## Self-Review

**Spec coverage.** Every numbered spec section maps to a task: §2 stack → Task 1; §2.1 pnpm → Task 1 + Task 16; §3 content model → Task 3; §3 graph derivation → Task 4; §4 rendering → Tasks 6, 7, 10; §5 interaction and status → Tasks 9, 10, plus §5's `statusWord` corrections in Task 5; §5 reduced motion → Task 2; §6 routing → Task 8; §7 SEO → Task 12; §7 redirects → Task 13; §8 styling → Task 2; §9 assets → Task 11; §10 accessibility → Tasks 7 (`inert`), 8 (`<nav>`), 9 (focus rings), 10 (labelled buttons); §11 testing → Tasks 4, 5, 14; §12 delivery → Tasks 1, 15, 16; §13 content decisions → Task 3 and Global Constraints; §14 risks → the `compressHTML` check in Task 6 Step 7 and the pnpm check in Task 16 Step 3.

**One deliberate deviation from the spec.** The schema gains `stats`, `highlights` and `previous`, which the spec's schema omitted — the `ben` panel's stat grid and the `gruntify` panel's highlights and "BEFORE THIS" list need them. Noted inline in Task 3.

**One defect found and fixed during review.** `Panel` originally took a `variant` prop mirroring `Map` and `Legend`, but `Screen.astro` renders panels once with `variant="desktop"`, so the mobile branch was dead code and mobile panels would have carried desktop padding. Panels now use responsive utilities and take no `variant`. The asymmetry is deliberate and explained in Task 7: the map renders twice because its coordinates genuinely differ between layouts; panels must render once so the prose appears in the DOM only once.

**Two items carried as verify-then-decide rather than asserted**, because they depend on Astro 7 behaviour I could not confirm from outside the build: whether `compressHTML: 'jsx'` preserves `·` spacing (Task 6 Step 7), and the exact Fontsource entry paths (Task 2 Step 3, Task 12 Step 5). Both have an explicit fallback.

**Accessibility contrast** is asserted in the spec but not testable in this plan's suite; the dimmest tier (`text-ink/28` on the footer counts) should be checked with a contrast tool during Task 16 Step 6 and lifted if it fails AA for its size.
