import { expect, test } from "@playwright/test";

// Guards for the map's spacing rules. Every check here measures rendered
// geometry rather than markup, because none of these failures change the
// HTML: the chips, the header and the map's overlay furniture are all
// present and correct in the DOM in every broken case. map.spec.ts already
// sweeps chip-vs-chip collisions across widths at a single height; this file
// covers the axes that sweep does not — height, the overlay furniture, and
// the two pieces of chip text whose length is not fixed.
test.describe("map spacing", () => {
  // See e2e/map.spec.ts for why this isn't test.skip's two-argument form.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

  /**
   * Chips that visually sit on top of the desktop map's own overlay text —
   * the "CLICK ANY NODE FOR DETAILS" caption, the legend, and the node/edge
   * counts. Those are absolutely positioned at fixed pixel offsets from the
   * map's corners while chips are placed as fractions of the map, so a SHORT
   * map slides the outer ring into them. Nothing about the markup changes,
   * and map.spec.ts's collision sweep runs at a single height (800), so this
   * class of defect is invisible to every other test in the suite.
   */
  async function furnitureCollisions(page: import("@playwright/test").Page) {
    return page.evaluate(() => {
      const map = document.querySelector("#bpG")!;
      const inner = map.querySelector("[data-map-inner]")!;
      const chips = [...inner.querySelectorAll("[data-node]")].map((el) => ({
        id: (el as HTMLElement).dataset.node!,
        rect: el.getBoundingClientRect(),
      }));

      // Every leaf element of the map that is not the chip layer: the
      // caption, each legend entry, the counts line.
      const overlays: Array<{ label: string; rect: DOMRect }> = [];
      for (const child of map.children) {
        if (child.hasAttribute("data-map-inner")) continue;
        for (const el of [child, ...child.querySelectorAll("*")]) {
          if (el.children.length > 0) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          overlays.push({
            label: (el.textContent ?? "").trim().slice(0, 24),
            rect,
          });
        }
      }

      const SLACK = 0.5;
      const hits: string[] = [];
      for (const chip of chips) {
        for (const overlay of overlays) {
          const w =
            Math.min(chip.rect.right, overlay.rect.right) -
            Math.max(chip.rect.left, overlay.rect.left);
          const h =
            Math.min(chip.rect.bottom, overlay.rect.bottom) -
            Math.max(chip.rect.top, overlay.rect.top);
          if (w > SLACK && h > SLACK) {
            hits.push(`${chip.id} over "${overlay.label}"`);
          }
        }
      }
      return { overlayCount: overlays.length, hits };
    });
  }

  // 660 is the case that actually broke: a 1366x768 laptop with browser
  // chrome leaves roughly this much viewport, which after the 64px header
  // gives a 596px map — short enough to push the outer ring into the caption
  // and the legend. 640 is the design floor the outer ring's radius was
  // chosen against (see posFor in src/lib/nodes.ts).
  const DESKTOP_VIEWPORTS: Array<[number, number]> = [
    [1152, 640],
    [1280, 660],
    [1366, 660],
    [1440, 720],
    [1440, 900],
    [1920, 1080],
  ];

  for (const [width, height] of DESKTOP_VIEWPORTS) {
    test(`no chip sits on the map's overlay text at ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const { overlayCount, hits } = await furnitureCollisions(page);

      // If the overlays ever stop rendering this test would pass vacuously,
      // which is the failure mode it exists to prevent.
      expect(overlayCount, "map overlay elements found").toBeGreaterThan(3);
      expect(hits, `chips over map furniture at ${width}x${height}`).toEqual(
        [],
      );
    });
  }

  /**
   * The core node's status text is the only chip copy whose length varies at
   * runtime: statusWord() returns "fiddling with the homelab" between 22:00
   * and 23:59 Brisbane, half again as long as anything else it returns. A
   * chip is a shrink-to-fit absolutely positioned box, so without a cap that
   * one string widens the core chip — the chip in the dead centre of the map,
   * with a neighbour either side — for two hours a night. The map's spacing
   * is solved against fixed chip sizes, so the chip must grow downward
   * instead, where there is room.
   *
   * Running at a normal hour, a test that only reads the live status word
   * would never see the long branch, so this substitutes the text directly.
   */
  // "projecting" is the longest word the chip is sized around, and the `ch`
  // cap in NodeChip.astro is set to exactly that string's length. The
  // comparison is against it rather than against whatever statusWord()
  // happens to return while the suite runs, which is usually shorter.
  const LONGEST_DESIGNED = "projecting";
  const LONGEST_POSSIBLE = "fiddling with the homelab";

  for (const [label, width, height, prefix] of [
    ["desktop", 1280, 900, "brisbane · currently "],
    ["mobile", 393, 659, "currently "],
  ] as const) {
    test(`the longest status word cannot widen the core chip (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const mapId = label === "desktop" ? "#bpG" : "#bpGM";
      const chip = page.locator(`${mapId} [data-node="ben"]`);

      const status = chip.locator("[data-status]");
      const measure = async (word: string) => {
        await status.evaluate((el, text) => {
          el.textContent = text;
        }, `${prefix}${word}`);
        return (await chip.boundingBox())!;
      };

      const designed = await measure(LONGEST_DESIGNED);
      const longest = await measure(LONGEST_POSSIBLE);

      // Width is the axis the map's spacing is solved tight on: the longest
      // possible status may not make the chip any wider than the longest one
      // it was designed around.
      expect(longest.width, "core chip width with the long status").toBeCloseTo(
        designed.width,
        0,
      );
      // It has to cost something, though — if the height is unchanged too
      // then the text never actually got longer and this proves nothing.
      expect(
        longest.height,
        "core chip height with the long status",
      ).toBeGreaterThan(designed.height);
    });
  }

  /**
   * Chip meta lines ("PROJECT · 2026", "EDUCATION · 2019–22") must render on
   * one line. They wrapped for the shortest-labelled projects, because a
   * chip's shrink-to-fit width is capped by the space between its `left`
   * offset and the map's right edge — so a node far to the right got a
   * narrower box than its own text needed.
   */
  for (const [label, width, height] of [
    ["desktop", 1280, 900],
    ["mobile", 393, 659],
  ] as const) {
    test(`no chip meta line wraps (${label})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const wrapped = await page.evaluate(
        (mapId) => {
          const map = document.querySelector(mapId)!;
          const out: string[] = [];
          for (const chip of map.querySelectorAll("[data-node]")) {
            if ((chip as HTMLElement).dataset.kind === "core") continue;
            const meta = chip.querySelector("[data-dot]")!.parentElement!
              .nextElementSibling as HTMLElement;
            const lineHeight = parseFloat(getComputedStyle(meta).lineHeight);
            const height = meta.getBoundingClientRect().height;
            // Two lines or more shows up as a box taller than 1.5 lines.
            if (height > lineHeight * 1.5) {
              out.push(
                `${(chip as HTMLElement).dataset.node}: ${meta.textContent?.trim()}`,
              );
            }
          }
          return out;
        },
        label === "desktop" ? "#bpG" : "#bpGM",
      );

      expect(wrapped, `chip meta lines wrapping (${label})`).toEqual([]);
    });
  }

  /**
   * The pulsing ring on the core node grows to 3.6x, so being a couple of
   * pixels off centre at rest reads as a visibly lopsided halo in motion. It
   * used to be positioned against the chip box with hand-tuned offsets and
   * sat ~2px right and ~4px below the dot; it now hangs off the dot itself,
   * which is what makes this assertion exact rather than approximate.
   */
  for (const [label, width, height] of [
    ["desktop", 1280, 900],
    ["mobile", 393, 659],
  ] as const) {
    test(`the core node's pulse ring is centred on its dot (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const offset = await page.evaluate(
        (mapId) => {
          const dot = document.querySelector(
            `${mapId} [data-node="ben"] [data-dot]`,
          )!;
          const style = getComputedStyle(dot, "::after");
          const ringW = parseFloat(style.width);
          const ringH = parseFloat(style.height);
          const left = parseFloat(style.left);
          const top = parseFloat(style.top);
          // The ::after metrics come back as unscaled CSS pixels, so the dot
          // has to be measured the same way: the mobile map carries a 0.82
          // fit transform, and getBoundingClientRect() would report the
          // scaled box and manufacture an offset that is not really there.
          const dotStyle = getComputedStyle(dot);
          const dotW = parseFloat(dotStyle.width);
          const dotH = parseFloat(dotStyle.height);
          // The ring is positioned against the dot's own padding box, so its
          // centre offset from the dot's centre must be zero on both axes.
          return {
            ringW,
            x: left + ringW / 2 - dotW / 2,
            y: top + ringH / 2 - dotH / 2,
          };
        },
        label === "desktop" ? "#bpG" : "#bpGM",
      );

      expect(offset.ringW, "pulse ring is rendered").toBeGreaterThan(0);
      expect(offset.x, "pulse ring x offset from the dot centre").toBeCloseTo(
        0,
        1,
      );
      expect(offset.y, "pulse ring y offset from the dot centre").toBeCloseTo(
        0,
        1,
      );
    });
  }
});

test.describe("header", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

  /**
   * The header is one row at every width. It used to stack into three rows
   * below `md`, which cost ~50px of vertical space on the viewports with
   * least to spare — and that column is `h-dvh`/`overflow-hidden`, so those
   * pixels come straight off the map and the panel.
   *
   * Both failure directions matter, so both are asserted: stacking (the old
   * behaviour) and overflowing (what a single row does when it is too narrow,
   * since every piece is `whitespace-nowrap`). With all four pieces visible
   * the row measures ~807px, which is why they only appear from `lg` (1024)
   * rather than `md` (768).
   */
  const HEADER_WIDTHS = [320, 360, 393, 640, 767, 768, 1023, 1024, 1280, 1920];

  for (const width of HEADER_WIDTHS) {
    test(`the header is a single row that fits at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const result = await page.evaluate(() => {
        const header = document.querySelector("header")!;
        const kids = [...header.children].map((el) =>
          el.getBoundingClientRect(),
        );
        const centre = (r: DOMRect) => r.top + r.height / 2;
        return {
          rows: kids.length,
          stacked: Math.abs(centre(kids[0]) - centre(kids[1])) > 2,
          overflows: header.scrollWidth > header.clientWidth + 1,
          bodyOverflows:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          height: header.getBoundingClientRect().height,
        };
      });

      expect(result.rows, "header groups").toBe(2);
      expect(result.stacked, `header stacked at ${width}px`).toBe(false);
      expect(result.overflows, `header overflows at ${width}px`).toBe(false);
      expect(result.bodyOverflows, `page scrolls sideways at ${width}px`).toBe(
        false,
      );
      // One row, not a wrapped one: 64px at full size, 56px compact.
      expect(result.height, `header height at ${width}px`).toBeLessThanOrEqual(
        64,
      );
    });
  }
});

/**
 * The legend lives in the mobile map's bottom-left corner, mirroring the
 * desktop rendition, rather than in a strip of its own above the map —
 * that strip cost the map ~34px of height on the viewports with least to
 * spare.
 *
 * It has to share the bottom edge with the zoom controls in the opposite
 * corner, and on one line it does not fit: the legend measures ~225px and
 * the controls ~113px, which with the corner offsets needs 374px of
 * width. That is fine from 375px up and collides at 360 and 320, so the
 * legend wraps. This sweeps the widths either side of that threshold,
 * because a regression here changes no markup at all — the legend and the
 * controls are both present and correct in the DOM in every broken case.
 */
test.describe("the mobile map's legend", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

  // Either side of the 374px one-line threshold, plus a landscape phone
  // and the top of the band the mobile rendition serves (breakpoint 1152).
  const VIEWPORTS: Array<[number, number]> = [
    [320, 720],
    [360, 740],
    [375, 812],
    [393, 659],
    [412, 915],
    [844, 390],
    [1000, 800],
    [1151, 700],
  ];

  for (const [width, height] of VIEWPORTS) {
    test(`the legend clears the zoom controls at ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const measured = await page.evaluate(() => {
        const mapEl = document.querySelector("#bpGM");
        const legendEl = document.querySelector("#bpGM [data-legend]");
        const zoomEl = document.querySelector("#bpGM [data-zoom-controls]");
        if (!mapEl || !legendEl || !zoomEl) return null;

        const map = mapEl.getBoundingClientRect();
        const legend = legendEl.getBoundingClientRect();
        const zoom = zoomEl.getBoundingClientRect();
        const overlapW =
          Math.min(legend.right, zoom.right) - Math.max(legend.left, zoom.left);
        const overlapH =
          Math.min(legend.bottom, zoom.bottom) - Math.max(legend.top, zoom.top);

        return {
          overlaps: overlapW > 0.5 && overlapH > 0.5,
          insideMap:
            legend.left >= map.left - 0.5 &&
            legend.right <= map.right + 0.5 &&
            legend.bottom <= map.bottom + 0.5 &&
            legend.top >= map.top - 0.5,
          fromLeft: legend.left - map.left,
          fromBottom: map.bottom - legend.bottom,
          height: legend.height,
        };
      });

      expect(
        measured,
        "legend and zoom controls inside the mobile map",
      ).not.toBeNull();
      expect(
        measured!.overlaps,
        `legend overlaps the zoom controls at ${width}x${height}`,
      ).toBe(false);
      expect(measured!.insideMap, "legend inside the map box").toBe(true);
      expect(
        measured!.fromLeft,
        "legend inset from the map's left",
      ).toBeLessThan(24);
      expect(
        measured!.fromBottom,
        "legend inset from the map's bottom",
      ).toBeLessThan(24);
      // Wrapping to a second line is allowed, but the whole legend has to
      // stay inside the vertical room panzoom.ts reserves along the bottom
      // edge (EDGE_PADDING.bottom = 44), or a panned chip can come to rest
      // underneath it.
      expect(
        measured!.fromBottom + measured!.height,
        "legend's total footprint above the map's bottom edge",
      ).toBeLessThan(44);
    });
  }
});

/**
 * A panel screenshot is `w-full`, which on the desktop panel and a
 * portrait phone is the right answer — both are around 353-380px wide. A
 * landscape phone is not: the sheet is as wide as the viewport there, so
 * an uncapped screenshot rendered ~800px across and buried the copy under
 * it. The cap is a width, so the image keeps its aspect ratio and nothing
 * is cropped.
 */
test.describe("panel screenshots", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

  const CAP = 380;

  for (const [label, width, height, minWidth] of [
    ["desktop", 1440, 900, 370],
    ["portrait phone", 393, 812, 330],
    ["landscape phone", 844, 390, 370],
  ] as const) {
    test(`the screenshot is capped at ${CAP}px wide (${label})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/deckos");

      const img = page.locator('[data-panel="deckos"] img');
      const box = (await img.boundingBox())!;
      const panel = (await page
        .locator('[data-panel="deckos"]')
        .boundingBox())!;

      expect(box.width, `screenshot width (${label})`).toBeLessThanOrEqual(
        CAP + 1,
      );
      // Not merely small: an image that failed to load, or one collapsed
      // by a bad cap, would satisfy the assertion above on its own.
      expect(box.width, `screenshot still renders (${label})`).toBeGreaterThan(
        minWidth,
      );
      expect(
        box.width,
        `screenshot fits its panel (${label})`,
      ).toBeLessThanOrEqual(panel.width);
    });
  }

  // Without this the landscape case above proves nothing: if the panel
  // were narrower than the cap, `w-full` alone would satisfy it.
  test("the landscape panel is wide enough for the cap to bind", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/deckos");
    const panel = (await page.locator('[data-panel="deckos"]').boundingBox())!;
    expect(panel.width, "landscape panel width").toBeGreaterThan(CAP + 120);
  });
});
