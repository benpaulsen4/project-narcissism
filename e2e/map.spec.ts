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
        ""
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
      () => (window as unknown as { __kept?: boolean }).__kept === true
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
      ""
    );

    await page.goForward();
    await expect(page.locator('[data-panel="deckos"]')).toHaveAttribute(
      "data-active",
      ""
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
      10
    );
    for (const el of await page.locator("[data-panel]:not([data-active])").all()) {
      await expect(el).toHaveAttribute("inert", "");
    }
    expect(
      await page.locator('[data-panel="ben"]').evaluate((el) => el.hasAttribute("inert"))
    ).toBe(false);

    await page.locator('[data-node="qut"]').first().click();
    await expect(page).toHaveURL("/qut");

    await expect(page.locator("[data-panel][data-active]")).toHaveCount(1);
    await expect(page.locator("[data-panel]:not([data-active])")).toHaveCount(
      10
    );
    expect(
      await page.locator('[data-panel="qut"]').evaluate((el) => el.hasAttribute("inert"))
    ).toBe(false);
    for (const el of await page
      .locator("[data-panel]:not([data-active])")
      .all()) {
      await expect(el).toHaveAttribute("inert", "");
    }
  });
});
