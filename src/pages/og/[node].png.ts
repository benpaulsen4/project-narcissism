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

// The Space Grotesk latin-700 webfont subset has no glyph for U+2192
// (RIGHTWARDS ARROW) — Gruntify's eyebrow ("JOB · 2022 → NOW · PLATFORM
// LEAD") is the only field the OG generator reads that contains one.
// Without a fallback font, satori/opentype.js render the arrow as a
// notdef box. This substitution is scoped to the rasterised image only;
// the site copy itself (rendered by the browser, which has font fallback)
// is untouched.
const rasterSafe = (text: string) => text.replace(/→/g, "->");

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
                fontSize: 26,
                letterSpacing: 4,
                color: KIND_COLOUR[kind],
              },
              children: rasterSafe(eyebrow),
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
