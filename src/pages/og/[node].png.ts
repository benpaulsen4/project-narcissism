import type { APIRoute, GetStaticPaths } from "astro";
import { readFile } from "node:fs/promises";
import satori from "satori";
import sharp from "sharp";
import { loadNodes } from "../../lib/nodes";

const WIDTH = 1200;
const HEIGHT = 630;

// Satori serialises unrecognised CSS colour functions straight through to
// the SVG `fill` attribute, and the resvg/sharp raster step that follows
// does not understand `oklch()` — it silently falls back to black, which
// disappears against the #0b0d11 background. These are the exact sRGB hex
// equivalents of the design tokens' oklch() values (accent oklch(0.8 0.16
// 165), job oklch(0.82 0.14 75), education oklch(0.75 0.14 300)), computed
// via the standard OKLab<->linear-sRGB conversion so the rendered colour
// matches the token exactly instead of approximating it.
const KIND_COLOUR: Record<string, string> = {
  core: "#2bdda4",
  capability: "#8d97a8",
  project: "#2bdda4",
  job: "#f9b64f",
  education: "#bc98f9",
};

export const getStaticPaths = (async () => {
  const nodes = await loadNodes();
  return nodes.map((node) => ({
    params: { node: node.id },
    props: { label: node.label, eyebrow: node.eyebrow, kind: node.kind },
  }));
}) satisfies GetStaticPaths;

const EYEBROW_FONT_SIZE = 26;

// The Space Grotesk latin-700 webfont subset has no glyph for U+2192
// (RIGHTWARDS ARROW) — Gruntify's eyebrow ("JOB · 2022 → NOW · PLATFORM
// LEAD") is the only field the OG generator reads that contains one, and
// no installed fallback font covers it either (checked both
// @fontsource-variable/jetbrains-mono, which ships only .woff2 that
// satori's bundled font parser cannot read at all, and the static
// @fontsource/jetbrains-mono, whose cmap lacks U+2192 in every locale
// subset — same Google Fonts Arrows-block exclusion as Space Grotesk).
// Rather than substitute a lookalike character or pull in a new typeface
// family for one glyph, the arrow is drawn as a small inline SVG instead
// of relying on the font at all — satori renders nested SVG element
// trees directly, so this sidesteps font coverage entirely.
//
// Sized off EYEBROW_FONT_SIZE (not a hardcoded pixel value) so it tracks
// the eyebrow text size if that ever changes. The viewBox is cropped
// tightly to the ink itself (no padding above/below the stroke), so
// aligning the row with `alignItems: "baseline"` — which, for a
// non-text element, aligns its bottom edge to the text baseline — seats
// the arrow's lowest point right on the baseline, the same way a
// glyph's flat-bottomed strokes (e.g. a capital letter) sit on it.
const ARROW_HEIGHT = Math.round(EYEBROW_FONT_SIZE * 0.5);
const ARROW_WIDTH = Math.round(ARROW_HEIGHT * (16 / 12));

const arrowIcon = (color: string) => ({
  type: "svg",
  props: {
    viewBox: "0 0 16 12",
    width: ARROW_WIDTH,
    height: ARROW_HEIGHT,
    style: { flexShrink: 0 },
    children: {
      type: "path",
      props: {
        d: "M0 6H11M7 0L13 6L7 12",
        stroke: color,
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        fill: "none",
      },
    },
  },
});

// Splits eyebrow text on "→" and interleaves the SVG arrow between the
// surrounding text runs, general enough that any future node whose
// eyebrow contains an arrow renders correctly without another fix.
const eyebrowChildren = (eyebrow: string, color: string) => {
  const parts = eyebrow.split("→").map((part) => part.trim());
  const children: unknown[] = [];
  parts.forEach((part, i) => {
    if (part) children.push(part);
    if (i < parts.length - 1) children.push(arrowIcon(color));
  });
  return children;
};

export const GET: APIRoute = async ({ props }) => {
  const { label, eyebrow, kind } = props as {
    label: string;
    eyebrow: string;
    kind: string;
  };

  const fontData = await readFile(
    "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff"
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
                display: "flex",
                flexDirection: "row",
                alignItems: "baseline",
                gap: 10,
                fontSize: EYEBROW_FONT_SIZE,
                letterSpacing: 4,
                color: KIND_COLOUR[kind],
              },
              children: eyebrowChildren(eyebrow, KIND_COLOUR[kind]),
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
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
