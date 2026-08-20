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
