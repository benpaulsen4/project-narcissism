import { expect, test } from "@playwright/test";

/** Pull the scale factor out of a `matrix(a, b, c, d, e, f)` computed transform. */
function scaleOf(matrix: string): number {
  const match = matrix.match(/matrix\(([^,]+),/);
  if (!match) throw new Error(`unexpected transform: ${matrix}`);
  return Number(match[1]);
}

test.describe("mobile map", () => {
  // See e2e/map.spec.ts for why this isn't the brief's literal two-argument
  // test.skip(...) form: it doesn't type-check against the pinned
  // @playwright/test 1.62.1. Same runtime effect — skip outside "mobile".
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
  });

  test("the mobile map is the visible instance and the desktop instance is not", async ({
    page,
  }) => {
    await page.goto("/");
    // The map renders twice per page (desktop and mobile coordinates
    // genuinely differ) — only one may actually be on screen at a time.
    // A selector or a stylesheet regression could leave both, or neither,
    // visible; presence of #bpGM alone would not catch that.
    await expect(page.locator("#bpGM")).toBeVisible();
    await expect(page.locator("#bpG")).toBeHidden();

    const box = await page.locator("#bpGM").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);
  });

  test("mobile starts fitted at scale(0.82)", async ({ page }) => {
    await page.goto("/");
    const inner = page.locator("#bpGMinner");
    const transform = await inner.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    expect(scaleOf(transform)).toBeCloseTo(0.82, 2);
  });

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

  // Strengthened / new: the brief's zoom test only asserts the transform
  // *changed*. It would pass even if "Fit map" landed on the wrong scale.
  // This pins the actual numbers the pan/zoom contract promises: zoom-in
  // increases scale above the fitted 0.82, and "Fit map" returns to exactly
  // that fitted scale, not merely to some scale different from before.
  test("zoom in increases scale and Fit map returns to exactly the fitted scale", async ({
    page,
  }) => {
    await page.goto("/");
    const inner = page.locator("#bpGMinner");

    const start = scaleOf(
      await inner.evaluate((el) => getComputedStyle(el).transform),
    );
    expect(start).toBeCloseTo(0.82, 2);

    await page.locator('[data-zoom="in"]').click();
    const zoomedIn = scaleOf(
      await inner.evaluate((el) => getComputedStyle(el).transform),
    );
    expect(zoomedIn).toBeGreaterThan(start);

    await page.locator('[data-zoom="out"]').click();
    await page.locator('[data-zoom="out"]').click();
    const zoomedOut = scaleOf(
      await inner.evaluate((el) => getComputedStyle(el).transform),
    );
    expect(zoomedOut).toBeLessThan(start);

    await page.locator('[data-zoom="reset"]').click();
    const fitted = scaleOf(
      await inner.evaluate((el) => getComputedStyle(el).transform),
    );
    expect(fitted).toBeCloseTo(0.82, 2);
  });

  test("zoom buttons carry the expected accessible labels", async ({
    page,
  }) => {
    await page.goto("/");
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

  /**
   * Panning to a limit must stop short of the map's edges, so the outermost
   * chips keep breathing room instead of coming to rest flush against the
   * border — and, at the bottom, underneath the zoom/fit controls.
   *
   * The insets are deliberately uneven: EDGE_PADDING in panzoom.ts gives the
   * top and bottom more room than the sides because that is where the map's
   * overlay UI lives (the caption top-left, the controls bottom-right). This
   * asserts the actual numbers rather than "greater than zero", because the
   * failure being guarded against is the bottom inset silently shrinking back
   * to the side inset and putting chips under the controls again.
   */
  const EDGE_PADDING = { top: 24, right: 16, bottom: 44, left: 16 };

  for (const [edge, dx, dy] of [
    ["left", 900, 0],
    ["right", -900, 0],
    ["top", 0, 900],
    ["bottom", 0, -900],
  ] as const) {
    test(`panning to the ${edge} stops short of the map edge`, async ({
      page,
    }) => {
      await page.goto("/");
      const box = (await page.locator("#bpGM").boundingBox())!;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      // Zoom in first. Fitted content is smaller than the map, so it is
      // locked centred and a drag is a correct no-op with no limit to hit.
      await page.locator('[data-zoom="in"]').click();
      await page.locator('[data-zoom="in"]').click();

      // One move, not an interpolated sweep. A drag that starts over the
      // map is cancelled by the browser straight after its first
      // pointermove: panzoom.ts receives `pointercancel`, drops the
      // gesture, and every later step is ignored. So a stepped move only
      // ever pans by its FIRST step — 75px of the 900 asked for here.
      // This test passed on that alone while the map was 392px tall,
      // because 75px already reached the limit in a box that small; the
      // map now fills the column and it does not. Sending the whole delta
      // in the one move that gets through removes the dependency on how
      // many moves survive, which is the part that was never being
      // asserted and differs between engines. (Verified in Chromium; the
      // suite's mobile project is WebKit, which cannot be launched on
      // every dev machine, so this is deliberately not written to depend
      // on either engine's cancellation timing.)
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + dx, cy + dy);
      await page.mouse.up();

      const inset = await page.evaluate(() => {
        const host = document.querySelector("#bpGM")!;
        const h = host.getBoundingClientRect();
        const chips = [
          ...host.querySelectorAll("[data-map-inner] [data-node]"),
        ].map((el) => el.getBoundingClientRect());
        const content = {
          left: Math.min(...chips.map((r) => r.left)),
          right: Math.max(...chips.map((r) => r.right)),
          top: Math.min(...chips.map((r) => r.top)),
          bottom: Math.max(...chips.map((r) => r.bottom)),
        };
        return {
          left: content.left - h.left,
          right: h.right - content.right,
          top: content.top - h.top,
          bottom: h.bottom - content.bottom,
          overflowsX: content.right - content.left > h.width,
          overflowsY: content.bottom - content.top > h.height,
        };
      });

      // The clamp only applies once the content is bigger than the box; if
      // the zoom above ever stopped overflowing it, this test would pass
      // without exercising anything.
      const overflows =
        edge === "left" || edge === "right"
          ? inset.overflowsX
          : inset.overflowsY;
      expect(overflows, `content overflows the map on the ${edge} axis`).toBe(
        true,
      );

      expect(inset[edge], `${edge} inset at the pan limit`).toBeGreaterThan(
        EDGE_PADDING[edge] - 2,
      );
      expect(inset[edge], `${edge} inset at the pan limit`).toBeLessThan(
        EDGE_PADDING[edge] + 2,
      );
    });
  }

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

/**
 * A visitor who lands on the map and does not realise the nodes are
 * tappable has no way forward — the reading panel is an overlay now, so
 * there is nothing on screen telling them what a node does. The map's
 * existing top-left caption takes that job over after a few seconds of
 * nothing being opened, rather than a new piece of furniture being added
 * to the two corners that are already spoken for.
 *
 * These tests wait out the real delay instead of reaching into the module
 * for it. A shorter delay exposed for the suite's benefit would be
 * test-only code in a shipped script, and it would stop the tests from
 * proving the thing that actually matters — that the prompt arrives on
 * its own, without being asked.
 */
test.describe("the tap prompt", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
  });

  test("the map opens showing the pan and zoom caption", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hint-pan]")).toBeVisible();
    await expect(page.locator("[data-hint-tap]")).toBeHidden();
  });

  test("the prompt takes over after a few seconds with nothing open", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-hint-tap]")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("[data-hint-pan]")).toBeHidden();
  });

  /**
   * Swapping the caption must not resize it, or the map's top-left corner
   * visibly jumps several seconds after load. The two lines share one grid
   * cell precisely so the box is sized to the longer of them from the
   * start.
   */
  test("the swap does not move or resize the caption", async ({ page }) => {
    await page.goto("/");
    const caption = page.locator("[data-map-hint]");
    const before = (await caption.boundingBox())!;

    await expect(page.locator("[data-hint-tap]")).toBeVisible({
      timeout: 10_000,
    });
    const after = (await caption.boundingBox())!;

    expect(after.x, "caption x").toBeCloseTo(before.x, 0);
    expect(after.y, "caption y").toBeCloseTo(before.y, 0);
    expect(after.width, "caption width").toBeCloseTo(before.width, 0);
    expect(after.height, "caption height").toBeCloseTo(before.height, 0);
  });

  test("a node route never prompts, because its panel is already open", async ({
    page,
  }) => {
    await page.goto("/gruntify");
    await page.waitForTimeout(7000);
    await expect(page.locator("[data-hint-tap]")).toBeHidden();
    // The caption itself is still there showing its usual line — without
    // this, a build that dropped the prompt markup altogether would pass.
    await expect(page.locator("[data-hint-pan]")).toBeVisible();
  });

  test("opening a node retires the prompt for the rest of the page", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-hint-tap]")).toBeVisible({
      timeout: 10_000,
    });

    await page.locator("#bpGM [data-node='gruntify']").tap();
    await expect(page.locator("[data-hint-tap]")).toBeHidden();

    // Closing the sheet must not bring it back. This visitor has been
    // shown what a node does, and waiting well past the delay proves the
    // timer is spent rather than merely restarted.
    await page.locator("[data-sheet-close]").tap();
    await page.waitForTimeout(7000);
    await expect(page.locator("[data-hint-tap]")).toBeHidden();
    await expect(page.locator("[data-hint-pan]")).toBeVisible();
  });

  /**
   * Suppression lasts for the page, not for the tab.
   *
   * It used to be persisted in `sessionStorage`, on the reasoning that a
   * visitor should only ever be told once. In practice that meant the
   * first node anyone opened silenced the prompt for the whole life of
   * the tab, reloads included — so on any browser that had been used to
   * look at the site even once, the prompt simply never appeared again.
   * A five-second caption in a corner is not worth remembering that hard.
   */
  test("a reload arms the prompt again", async ({ page }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='gruntify']").tap();
    await page.locator("[data-sheet-close]").tap();
    await expect(page.locator("[data-hint-tap]")).toBeHidden();

    await page.reload();

    await expect(page.locator("[data-hint-tap]")).toBeVisible({
      timeout: 10_000,
    });
  });
});
