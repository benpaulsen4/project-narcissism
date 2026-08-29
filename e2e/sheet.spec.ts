import { expect, test } from "@playwright/test";

/**
 * The mobile reading panel is an overlay sheet, not a fixed row in the
 * column. The column used to be header + legend + map + panel stacked
 * vertically, which is survivable in portrait and unusable in landscape:
 * a 390px-tall viewport had to fund a header, a legend, a map and a
 * readable panel out of the same 390px, so the map was squeezed to a
 * letterbox. The sheet takes the panel out of that budget entirely — the
 * map owns everything below the header at every orientation, and the
 * panel is summoned over it.
 *
 * The contract these tests pin:
 *
 *   /          → ben active, sheet closed (the map, full screen)
 *   /#ben      → ben active, sheet open
 *   /<node>    → that node active, sheet open
 *
 * Openness is derived from the URL and nothing else, which is what lets
 * the server render the correct state for a cold load of any route — the
 * per-node static pages still arrive with their panel open and no script
 * involved. See e2e/no-js.spec.ts for the JavaScript-off half.
 */
test.describe("mobile reading sheet", () => {
  // See e2e/map.spec.ts for why this isn't test.skip's two-argument form.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
  });

  test("the home route renders the sheet closed", async ({ page }) => {
    await page.goto("/");
    // Count first: `toBeHidden` is satisfied by an element that isn't
    // there at all, and every closed-state assertion in this file would
    // pass against a document with no sheet in it.
    await expect(page.locator("[data-sheet]")).toHaveCount(1);
    await expect(page.locator("[data-sheet]")).toBeHidden();
  });

  /**
   * The whole point of the change. `toBeHidden` above would still pass if
   * the sheet were merely hidden and the map left at its old fixed height,
   * so the map's actual share of the viewport is what gets asserted.
   */
  test("the map fills the viewport below the header in portrait", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 659 });
    await page.goto("/");

    const map = (await page.locator("#bpGM").boundingBox())!;
    const header = (await page.locator("header").boundingBox())!;
    // Everything from the bottom of the header to the bottom of the
    // viewport, less the legend strip, belongs to the map.
    expect(map.height).toBeGreaterThan(500);
    expect(map.y + map.height).toBeGreaterThan(659 - 2);
    expect(map.y).toBeGreaterThanOrEqual(header.height);
  });

  /**
   * Landscape is the case that forced this change: the old column gave the
   * map `min(392px, 100dvh - 260px)`, which on a 390px-tall viewport was
   * 130px — a letterbox with no room to read the graph.
   */
  test("the map fills the viewport below the header in landscape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");

    const map = (await page.locator("#bpGM").boundingBox())!;
    expect(map.height).toBeGreaterThan(250);
    expect(map.y + map.height).toBeGreaterThan(390 - 2);
  });

  test("a node route renders the sheet already open", async ({ page }) => {
    await page.goto("/gruntify");
    await expect(page.locator("[data-sheet]")).toBeVisible();
    await expect(page.locator('[data-panel="gruntify"]')).toBeVisible();
  });

  test("tapping a node chip opens the sheet on that node", async ({ page }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='gruntify']").tap();

    await expect(page).toHaveURL("/gruntify");
    await expect(page.locator("[data-sheet]")).toBeVisible();
    await expect(page.locator('[data-panel="gruntify"]')).toHaveAttribute(
      "data-active",
      "",
    );
  });

  test("the close control shuts the sheet and returns to the map", async ({
    page,
  }) => {
    await page.goto("/gruntify");
    await page.locator("[data-sheet-close]").tap();

    await expect(page.locator("[data-sheet]")).toBeHidden();
    await expect(page).toHaveURL("/");
  });

  /**
   * The sheet deliberately stops short of the top of the viewport so the
   * dimmed space above it is a large, obvious dismiss target — that gap is
   * the affordance, so its existence is asserted rather than assumed.
   */
  test("tapping the space above the sheet closes it", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 659 });
    await page.goto("/gruntify");

    const surface = (await page.locator("[data-sheet-surface]").boundingBox())!;
    expect(surface.y, "dismiss gap above the sheet").toBeGreaterThan(40);

    await page.touchscreen.tap(196, surface.y / 2);

    await expect(page.locator("[data-sheet]")).toBeHidden();
    await expect(page).toHaveURL("/");
  });

  test("closing is a history entry, so back reopens the node", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='gruntify']").tap();
    await page.locator("[data-sheet-close]").tap();
    await expect(page).toHaveURL("/");

    await page.goBack();

    await expect(page).toHaveURL("/gruntify");
    await expect(page.locator("[data-sheet]")).toBeVisible();
    await expect(page.locator('[data-panel="gruntify"]')).toHaveAttribute(
      "data-active",
      "",
    );
  });

  /**
   * `/` means "closed", so the core node cannot use its own canonical URL
   * to mean "open" as well. The fragment is what distinguishes them, and
   * without it the ben panel — the intro copy and the contact pills —
   * would be desktop-only.
   */
  test("the core node opens at /#ben", async ({ page }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='ben']").tap();

    await expect(page).toHaveURL("/#ben");
    await expect(page.locator("[data-sheet]")).toBeVisible();
    await expect(page.locator('[data-panel="ben"]')).toHaveAttribute(
      "data-active",
      "",
    );
  });

  test("a cold load of /#ben opens the sheet on the core node", async ({
    page,
  }) => {
    await page.goto("/#ben");
    await expect(page.locator("[data-sheet]")).toBeVisible();
    await expect(page.locator('[data-panel="ben"]')).toBeVisible();
  });

  test("back from /#ben closes the sheet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='ben']").tap();
    await expect(page.locator("[data-sheet]")).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL("/");
    await expect(page.locator("[data-sheet]")).toBeHidden();
  });

  test("escape closes the sheet", async ({ page }) => {
    await page.goto("/gruntify");
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-sheet]")).toBeHidden();
    await expect(page).toHaveURL("/");
  });

  /**
   * A closed sheet must be out of the accessibility tree, not merely
   * transparent. `/gruntify`'s panel is `data-active` even while the sheet
   * is shut, so an opacity-only hide would leave a screenful of links and
   * headings tabbable behind the map.
   */
  test("a closed sheet takes its panel out of the tab order", async ({
    page,
  }) => {
    await page.goto("/gruntify");
    await page.locator("[data-sheet-close]").tap();

    await expect(
      page.locator('[data-panel="gruntify"] a').first(),
    ).toBeHidden();
  });

  /**
   * An overlay that takes over the viewport has to take the keyboard with
   * it, and hand it back on the way out. This is also the assertion that
   * catches the sheet being focusable only after its transition finishes:
   * an element is not focusable while it is `visibility: hidden`, so a
   * `focus()` issued in the same breath as the open is silently dropped.
   */
  test("opening the sheet moves focus to its close control", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='gruntify']").tap();
    await expect(page.locator("[data-sheet-close]")).toBeFocused();
  });

  test("closing returns focus to the chip that opened the sheet", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#bpGM [data-node='gruntify']").tap();
    await page.locator("[data-sheet-close]").tap();
    await expect(page.locator("#bpGM [data-node='gruntify']")).toBeFocused();
  });

  test("opening another node from an open sheet swaps the panel", async ({
    page,
  }) => {
    await page.goto("/gruntify");
    await page.locator("[data-sheet-close]").tap();
    await page.locator("#bpGM [data-node='deckos']").tap();

    await expect(page).toHaveURL("/deckos");
    await expect(page.locator('[data-panel="deckos"]')).toHaveAttribute(
      "data-active",
      "",
    );
    await expect(page.locator('[data-panel="gruntify"]')).not.toHaveAttribute(
      "data-active",
      "",
    );
  });
});

/**
 * The sheet is a mobile rendition. Above the breakpoint the panel is still
 * a column of the grid, permanently visible beside the map, and none of
 * the sheet's machinery may leak into it — no scrim, no close control, and
 * no possibility of the panel being hidden.
 */
test.describe("desktop panel is untouched by the sheet", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
  });

  test("the panel is visible and the close control is not", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-panel="ben"]')).toBeVisible();
    // Present in the markup — one document serves both renditions — but
    // never rendered here. Asserting the count first is what stops this
    // passing vacuously if the control is ever dropped altogether.
    await expect(page.locator("[data-sheet-close]")).toHaveCount(1);
    await expect(page.locator("[data-sheet-close]")).toBeHidden();
  });

  test("the panel sits beside the map rather than over it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/gruntify");

    const map = (await page.locator("#bpG").boundingBox())!;
    const surface = (await page.locator("[data-sheet-surface]").boundingBox())!;
    // Side by side: the panel starts where the map ends.
    expect(surface.x).toBeGreaterThanOrEqual(map.x + map.width - 1);
    expect(surface.y).toBeLessThan(map.y + 2);
  });

  test("clicking the core node stays on / without a fragment", async ({
    page,
  }) => {
    await page.goto("/gruntify");
    await page.locator("#bpG [data-node='ben']").click();
    await expect(page).toHaveURL("/");
  });
});
