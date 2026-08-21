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
  // The brief's `test.skip((args, testInfo) => ...)` two-argument form does
  // not type-check against the pinned @playwright/test 1.62.1 — that
  // version's ConditionBody only accepts the fixtures object, not a second
  // testInfo parameter. This beforeEach form is behaviourally identical
  // (skip every test in this file outside the desktop project) and compiles
  // cleanly under `pnpm check`.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

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

  // Strengthened beyond the brief: the brief only checks that *a* traced edge
  // exists in the DOM. That would still pass if the map collapsed to zero
  // height (Task 6's regression) — a hidden element with the attribute is
  // still "in the DOM". This asserts the traced edge has real, non-empty
  // rendered geometry, and that an unrelated node is not just tagged
  // data-dimmed but is actually rendered at reduced opacity.
  test("hovering a node traces its edges with real geometry and visibly dims the rest", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('[data-node="watchthis"]').first().hover();

    const traced = page.locator("[data-edge][data-traced]").first();
    await expect(traced).toBeVisible();
    const box = await traced.boundingBox();
    expect(box).not.toBeNull();
    // An SVG line's bounding box can be zero on one axis if it is
    // perfectly axis-aligned, but never on both if it actually spans space.
    expect((box!.width ?? 0) + (box!.height ?? 0)).toBeGreaterThan(0);

    // watchthis is wired to [frontend, backend] only, so gruntify (wired to
    // frontend/backend/platform/product, but not directly to watchthis) is
    // guaranteed unrelated and must dim.
    //
    // NodeChip carries `transition-[...,opacity] duration-300`, so the
    // dimmed opacity is reached asynchronously over 300ms after
    // data-dimmed flips — a synchronous getComputedStyle() read right
    // after hover() can still catch the pre-transition value. toHaveCSS
    // is Playwright's auto-retrying assertion: it polls the computed style
    // until it matches or the assertion timeout elapses, so it waits out
    // the transition instead of racing it (no fixed sleep, which would
    // rot the moment the duration token changes).
    const dimmed = page.locator('[data-node="gruntify"]').first();
    await expect(dimmed).toHaveAttribute("data-dimmed", "");
    await expect(dimmed).toHaveCSS("opacity", "0.32");

    // The hovered node itself and a real neighbour must stay at full opacity.
    const related = page.locator('[data-node="frontend"]').first();
    await expect(related).toHaveCSS("opacity", "1");
  });

  test("the footer counts are derived, not hardcoded", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/11 nodes · 17 edges/)).toBeVisible();
  });

  // Strengthened / new: this is the regression test for Task 6, where the
  // map's root element had zero rendered height because every child was
  // absolutely positioned and the emitted HTML looked perfect. Presence of
  // [data-map] in the DOM would not have caught that; only a real bounding
  // box does.
  test("the desktop map renders with a real, non-zero bounding box", async ({
    page,
  }) => {
    await page.goto("/");
    const map = page.locator("#bpG");
    await expect(map).toBeVisible();

    const box = await map.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    // A chip positioned inside a collapsed map would report a bounding box,
    // but it would sit outside the (zero-height) parent's viewport clip.
    // Confirm a node chip is actually within the map's rendered bounds.
    const chip = page.locator('[data-node="frontend"]').first();
    const chipBox = await chip.boundingBox();
    expect(chipBox).not.toBeNull();
    expect(chipBox!.y).toBeGreaterThanOrEqual(box!.y);
    expect(chipBox!.y).toBeLessThanOrEqual(box!.y + box!.height);
  });

  // Accessibility invariant: exactly one panel is the active, focusable one
  // and the other ten are inert — both on initial load and after a
  // client-side swap. A swap that leaves two panels active, none active, or
  // the new panel still inert is a real regression a presence check misses.
  test("exactly one panel is active and inert on the other ten survives a client-side swap", async ({
    page,
  }) => {
    await page.goto("/");

    const panels = page.locator("[data-panel]");
    await expect(panels).toHaveCount(11);
    await expect(page.locator("[data-panel][data-active]")).toHaveCount(1);
    await expect(page.locator("[data-panel]:not([data-active])")).toHaveCount(
      10,
    );
    for (const el of await page
      .locator("[data-panel]:not([data-active])")
      .all()) {
      await expect(el).toHaveAttribute("inert", "");
    }
    expect(
      await page
        .locator('[data-panel="ben"]')
        .evaluate((el) => el.hasAttribute("inert")),
    ).toBe(false);

    await page.locator('[data-node="qut"]').first().click();
    await expect(page).toHaveURL("/qut");

    await expect(page.locator("[data-panel][data-active]")).toHaveCount(1);
    await expect(page.locator("[data-panel]:not([data-active])")).toHaveCount(
      10,
    );
    expect(
      await page
        .locator('[data-panel="qut"]')
        .evaluate((el) => el.hasAttribute("inert")),
    ).toBe(false);
    for (const el of await page
      .locator("[data-panel]:not([data-active])")
      .all()) {
      await expect(el).toHaveAttribute("inert", "");
    }
  });
});

// The rest of the suite runs at exactly two viewports — devices["Desktop
// Chrome"] (1280x720) and devices["iPhone 14 Pro"] (393x659). Every chip
// position is a fraction of the map, but the desktop chips were fixed pixel
// boxes in a `1fr` column beside a fixed 440px panel, so between the old
// `md` breakpoint (768px) and ~1152px the map narrowed while the chips did
// not and they collided; and on a short landscape phone the fixed-height
// mobile map squeezed the panel out of the viewport entirely. Both failures
// are invisible to markup assertions — the HTML is identical at every width
// — so these tests measure rendered geometry instead.
//
// The fix moved the rendition switch itself, from `md` (768px) to
// `desktop:` (1152px — see `--breakpoint-desktop` in global.css): below
// that width the mobile rendition (full-width map, pan/zoom, panel below)
// is what's on screen, not the desktop one whose fixed-size chips used to
// collide there. So "which rendition is actually visible" is now part of
// what these tests assert, rather than an assumption baked into `#bpG`
// selectors — a test that kept assuming #bpG below 1152px would measure a
// hidden, zero-sized element and pass vacuously, which is exactly the kind
// of false green this whole fix exists to close off.
test.describe("map geometry away from the two default viewports", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

  /**
   * Finds whichever map rendition is actually rendered on screen — #bpG
   * (desktop) or #bpGM (mobile), per Screen.astro's `desktop:`/
   * `max-desktop:` classes — and reports its overlap/clipping geometry.
   */
  async function visibleMapGeometry(page: import("@playwright/test").Page) {
    return page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect();
      const isVisible = (el: Element | null) =>
        !!el &&
        getComputedStyle(el).display !== "none" &&
        box(el).width > 0 &&
        box(el).height > 0;

      const desktopMap = document.querySelector("#bpG");
      const mobileMap = document.querySelector("#bpGM");
      const rendition = isVisible(desktopMap)
        ? "desktop"
        : isVisible(mobileMap)
          ? "mobile"
          : "neither";
      const mapEl = (rendition === "desktop" ? desktopMap : mobileMap)!;
      const map = box(mapEl);
      const chips = [...mapEl.querySelectorAll("[data-node]")].map((el) => ({
        id: (el as HTMLElement).dataset.node!,
        rect: box(el),
      }));

      // Sub-pixel slack: touching edges are fine, a real collision is not.
      const SLACK = 0.5;

      const overlaps: string[] = [];
      for (let i = 0; i < chips.length; i += 1) {
        for (let j = i + 1; j < chips.length; j += 1) {
          const a = chips[i].rect;
          const b = chips[j].rect;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > SLACK && h > SLACK) {
            overlaps.push(
              `${chips[i].id}/${chips[j].id} overlap ${Math.round(w)}x${Math.round(h)}`,
            );
          }
        }
      }

      const escapes: string[] = [];
      for (const chip of chips) {
        const out = Math.max(
          map.left - chip.rect.left,
          chip.rect.right - map.right,
          map.top - chip.rect.top,
          chip.rect.bottom - map.bottom,
        );
        if (out > SLACK) {
          escapes.push(`${chip.id} clipped ${Math.round(out)}px by the map`);
        }
      }

      return { rendition, overlaps, escapes };
    });
  }

  // Sweeps the whole band this fix touches: the mobile rendition now covers
  // 768–1100px (where the desktop chips used to collide), and the desktop
  // rendition only ever appears from 1152px up. Every width must show the
  // rendition the breakpoint promises, with zero collisions and zero
  // clipping — this is what guards the 768–1152 band the two default
  // viewports never exercise.
  const WIDTHS_AND_RENDITIONS: Array<[number, "desktop" | "mobile"]> = [
    [768, "mobile"],
    [800, "mobile"],
    [900, "mobile"],
    [1000, "mobile"],
    [1100, "mobile"],
    [1152, "desktop"],
    [1280, "desktop"],
    [1440, "desktop"],
    [1920, "desktop"],
  ];

  for (const [width, expected] of WIDTHS_AND_RENDITIONS) {
    test(`the ${expected} rendition is visible with no collisions or clipping at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const { rendition, overlaps, escapes } = await visibleMapGeometry(page);

      expect(rendition, `visible rendition at ${width}px`).toBe(expected);
      expect(overlaps, `chip collisions at ${width}px`).toEqual([]);
      expect(escapes, `chips clipped at ${width}px`).toEqual([]);
    });
  }

  // The other half of the contract: the desktop chips shrink *below* the
  // map width the design was drawn for (840px, i.e. the 1280px approved
  // view) and are pinned to the design's own metrics at and above it.
  // Without this, "make the chips fit" could be satisfied by shrinking them
  // everywhere, or by letting them grow on a 4K monitor. The desktop
  // rendition only exists from 1152px up now (map=712px), so that — not the
  // old `md` breakpoint — is the shrunk end of the range, and 1280px
  // (map=840px) is where the cap now bites instead of 1152px.
  test("desktop chip metrics are capped at the design size from 1280px up, and scale down between 1152 and 1280", async ({
    page,
  }) => {
    const widthOfBenChip = async (width: number) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      return page
        .locator('#bpG [data-node="ben"]')
        .evaluate((el) => el.getBoundingClientRect().width);
    };

    const atDesign = await widthOfBenChip(1280);
    expect(await widthOfBenChip(1920)).toBeCloseTo(atDesign, 1);

    const at1200 = await widthOfBenChip(1200);
    const at1152 = await widthOfBenChip(1152);
    expect(at1200).toBeLessThan(atDesign);
    expect(at1152).toBeLessThan(at1200);
  });

  // Regression coverage for the clipping fix: FIT_SCALE (0.82) was a
  // hardcoded constant, so a short landscape phone — where the map's own
  // height budget compresses to ~100px (see Map.astro's `h-[min(392px,...)]`
  // comment) — clipped chips at the fitted view. panzoom.ts now derives the
  // fit scale from the real content/host boxes and never exceeds 0.82, so
  // the approved 768-1100px band must stay clipped-free exactly as before,
  // and 640x360 (the case that used to clip) must be clipped-free too.
  const MOBILE_BAND_FIT_VIEWPORTS: Array<[number, number]> = [
    [393, 659],
    [640, 360],
    [768, 900],
    [1000, 800],
    [1100, 700],
  ];

  for (const [width, height] of MOBILE_BAND_FIT_VIEWPORTS) {
    test(`the fitted mobile view has zero clipped chips at ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const { rendition, escapes } = await visibleMapGeometry(page);
      expect(rendition, `visible rendition at ${width}x${height}`).toBe(
        "mobile",
      );
      expect(escapes, `chips clipped at ${width}x${height}`).toEqual([]);
    });
  }

  // Regression coverage for the pan-clamp fix: translation used to be
  // unbounded, so an aggressive drag could push the entire map out of the
  // host box with no way back except the "Fit map" button. Dragging far
  // beyond the content in every direction must never fully strand it —
  // some part of the content must always still overlap the host box.
  test("dragging far beyond the content cannot strand it off-screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 360 });
    await page.goto("/");

    const host = page.locator("#bpGM");
    const box = (await host.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    for (const [dx, dy] of [
      [-4000, 0],
      [4000, 0],
      [0, -4000],
      [0, 4000],
    ]) {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + dx, cy + dy, { steps: 10 });
      await page.mouse.up();

      const overlap = await page.evaluate(() => {
        const hostEl = document.querySelector("#bpGM")!;
        const hostRect = hostEl.getBoundingClientRect();
        const nodeEls = [
          ...document.querySelectorAll("#bpGMinner [data-node]"),
        ];
        let left = Infinity,
          top = Infinity,
          right = -Infinity,
          bottom = -Infinity;
        for (const el of nodeEls) {
          const r = el.getBoundingClientRect();
          left = Math.min(left, r.left);
          top = Math.min(top, r.top);
          right = Math.max(right, r.right);
          bottom = Math.max(bottom, r.bottom);
        }
        const overlapW =
          Math.min(right, hostRect.right) - Math.max(left, hostRect.left);
        const overlapH =
          Math.min(bottom, hostRect.bottom) - Math.max(top, hostRect.top);
        return { w: overlapW, h: overlapH };
      });

      expect(
        overlap.w,
        "content still overlaps the host box horizontally",
      ).toBeGreaterThan(0);
      expect(
        overlap.h,
        "content still overlaps the host box vertically",
      ).toBeGreaterThan(0);
    }
  });

  test("the panel is reachable on a short landscape phone (640x360)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 360 });
    await page.goto("/");

    const measured = await page.evaluate(() => {
      const panel = document.querySelector("[data-panel][data-active]")!;
      const host = panel.parentElement!;
      return {
        hostHeight: host.getBoundingClientRect().height,
        panelTop: panel.getBoundingClientRect().top,
        viewportHeight: window.innerHeight,
      };
    });

    expect(measured.hostHeight, "panel host height").toBeGreaterThan(120);
    expect(measured.panelTop, "active panel top").toBeLessThan(
      measured.viewportHeight,
    );
    expect(measured.panelTop, "active panel top").toBeGreaterThanOrEqual(0);
  });

  // 1000px used to render the (broken) desktop rendition — it is now
  // squarely inside the band the mobile rendition took over. mobile.spec.ts
  // exercises the same pan/zoom/tap-vs-pan contract at the "mobile" project's
  // fixed 393px, touch-emulated viewport; this repeats it at a width that
  // project never covers, using mouse events instead of touch since the
  // "desktop" project here has no touch emulation — proving the contract
  // holds on the pointer-event code path a mouse-and-narrow-window visitor
  // would actually hit, not just on a touch device.
  test.describe("mobile rendition at a width the mobile project never covers (1000px)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1000, height: 800 });
      await page.goto("/");
      await expect(page.locator("#bpGM")).toBeVisible();
      await expect(page.locator("#bpG")).toBeHidden();
    });

    test("zoom buttons carry their labels and change the map transform", async ({
      page,
    }) => {
      await expect(page.locator('[data-zoom="out"]')).toHaveAttribute(
        "aria-label",
        "Zoom out",
      );
      await expect(page.locator('[data-zoom="reset"]')).toHaveAttribute(
        "aria-label",
        "Fit map",
      );
      await expect(page.locator('[data-zoom="in"]')).toHaveAttribute(
        "aria-label",
        "Zoom in",
      );

      const inner = page.locator("#bpGMinner");
      const before = await inner.evaluate(
        (el) => getComputedStyle(el).transform,
      );
      await page.locator('[data-zoom="in"]').click();
      const after = await inner.evaluate(
        (el) => getComputedStyle(el).transform,
      );
      expect(after).not.toBe(before);
    });

    test("dragging the map pans it and the tap-vs-pan guard blocks the trailing click", async ({
      page,
    }) => {
      // At 1000x800 the fitted content (0.82 scale) is fully contained by
      // the host box on both axes — the pan clamp added for the clipping
      // fix correctly locks a fully-visible map centred rather than letting
      // it drift (there is nothing to pan to), so a drag right at the
      // fitted scale is a legitimate no-op for the transform. Zooming in
      // first gives the content real room to pan, which is also the
      // realistic sequence (a user zooms before panning), while still
      // exercising the same pointer-drag / tap-vs-pan-guard code path this
      // test targets. Three steps (1.2x each, from 0.82) clears both the
      // host's width and height at this content size, so there is real
      // room to pan on either axis.
      for (let i = 0; i < 3; i += 1) {
        await page.locator('[data-zoom="in"]').click();
      }

      const inner = page.locator("#bpGMinner");
      const before = await inner.evaluate(
        (el) => getComputedStyle(el).transform,
      );

      // Drag from the host's own centre rather than a specific chip's
      // position: after zooming, a given chip can already sit flush against
      // the pan clamp's boundary in the drag's direction (a legitimate
      // clamped state, not a bug), which would make this drag a false-
      // negative no-op. The centre always has room to move in a large,
      // single, well-clear-of-any-edge direction once content exceeds the
      // host on both axes. The tap-vs-pan guard is global (it flips
      // data-dragged on the shared inner element), so it does not matter
      // that the drag doesn't start on a specific node.
      const hostBox = (await page.locator("#bpGM").boundingBox())!;
      const cx = hostBox.x + hostBox.width / 2;
      const cy = hostBox.y + hostBox.height / 2;

      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 300, cy + 150, { steps: 10 });
      await page.mouse.up();

      const after = await inner.evaluate(
        (el) => getComputedStyle(el).transform,
      );
      expect(after, "pan moved the map transform").not.toBe(before);
      // The drag must not have been read as a click on whatever it landed on.
      await expect(page).toHaveURL("/");
    });

    test("a plain click (no drag) on a node opens its panel", async ({
      page,
    }) => {
      await page.locator("#bpGM [data-node='gruntify']").click();
      await expect(page).toHaveURL("/gruntify");
      await expect(page.locator('[data-panel="gruntify"]')).toHaveAttribute(
        "data-active",
        "",
      );
    });
  });
});
