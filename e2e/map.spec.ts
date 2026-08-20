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
// position is a fraction of the map, but the chips themselves were fixed
// pixel boxes in a `1fr` column beside a fixed 440px panel, so between the
// `md` breakpoint and ~1152px the map narrowed while the chips did not and
// they collided; and on a short landscape phone the fixed-height mobile map
// squeezed the panel out of the viewport entirely. Both failures are
// invisible to markup assertions — the HTML is identical at every width —
// so these tests measure rendered geometry instead.
test.describe("map geometry away from the two default viewports", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

  /** Rounded-to-the-pixel overlap and clipping report for the desktop chips. */
  async function desktopChipGeometry(page: import("@playwright/test").Page) {
    return page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect();
      const map = box(document.querySelector("#bpG")!);
      const chips = [...document.querySelectorAll("#bpG [data-node]")].map(
        (el) => ({ id: (el as HTMLElement).dataset.node!, rect: box(el) }),
      );

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

      return { overlaps, escapes };
    });
  }

  for (const size of [
    { width: 800, height: 800 },
    { width: 1000, height: 800 },
  ]) {
    test(`no chip collides or escapes the map at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto("/");
      await expect(page.locator("#bpG")).toBeVisible();

      const { overlaps, escapes } = await desktopChipGeometry(page);
      expect(
        overlaps,
        `chip collisions at ${size.width}x${size.height}`,
      ).toEqual([]);
      expect(escapes, `chips clipped at ${size.width}x${size.height}`).toEqual(
        [],
      );
    });
  }

  // The other half of the contract: the chips shrink *below* the width the
  // design was drawn for and are pinned to the design's own metrics at and
  // above it. Without this, "make the chips fit" could be satisfied by
  // shrinking them everywhere, or by letting them grow on a 4K monitor.
  test("desktop chip metrics are capped at the design size from 1152px up", async ({
    page,
  }) => {
    const widthOfBenChip = async (width: number) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      return page
        .locator('#bpG [data-node="ben"]')
        .evaluate((el) => el.getBoundingClientRect().width);
    };

    const atDesign = await widthOfBenChip(1152);
    expect(await widthOfBenChip(1280)).toBeCloseTo(atDesign, 1);
    expect(await widthOfBenChip(1920)).toBeCloseTo(atDesign, 1);
    expect(await widthOfBenChip(1000)).toBeLessThan(atDesign);
    expect(await widthOfBenChip(800)).toBeLessThan(atDesign);
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
});
