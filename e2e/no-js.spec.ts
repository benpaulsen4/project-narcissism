import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

// Every route, not just a sample: progressive enhancement is the suite's
// centrepiece property. With JS disabled, every one of these must be a real
// prerendered page — nothing here can depend on the map island running.
const ROUTES = [
  ["/", "ben"],
  ["/frontend", "frontend"],
  ["/backend", "backend"],
  ["/platform", "platform"],
  ["/product", "product"],
  ["/deckos", "deckos"],
  ["/watchthis", "watchthis"],
  ["/api-workshop", "api-workshop"],
  ["/imperfections", "imperfections"],
  ["/gruntify", "gruntify"],
  ["/qut", "qut"],
] as const;

for (const [path, id] of ROUTES) {
  test(`${path} serves its panel active without JavaScript`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    // A real prerendered page, not a soft-404 or redirect swallowed by
    // an SPA shell.
    expect(response?.status()).toBe(200);
    await expect(page.locator(`[data-panel="${id}"]`)).toHaveAttribute(
      "data-active",
      "",
    );
  });
}

// Shipping all eleven panels on all eleven routes is deliberate, but it must
// not also ship eleven <h1>s: the served document is what a crawler reads, and
// this whole rebuild is justified by indexing better than the four-route app
// it replaced. Exactly one <h1>, and it must be the route's own panel.
test("every route serves exactly one h1, on its own panel", async ({
  page,
}) => {
  for (const [path, id] of ROUTES) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(`[data-panel="${id}"] h1`)).toHaveCount(1);
    // The other ten are demoted, not dropped — the copy still ships.
    await expect(page.locator("[data-panel] h2")).toHaveCount(10);
  }
});

test("every panel's copy is in the DOM on every route", async ({ page }) => {
  await page.goto("/qut");
  await expect(page.locator("[data-panel]")).toHaveCount(11);
  await expect(
    page.locator('[data-panel="watchthis"]', {
      hasText: "TMDB data underneath",
    }),
  ).toHaveCount(1);
});

// Static output serves 404.html at /404 with a 200, so the route is
// crawlable however the host handles unmatched paths. It must therefore
// withdraw itself: noindex, and no canonical claiming /404 as a real URL.
test("the 404 page is noindex and claims no canonical URL", async ({
  page,
}) => {
  await page.goto("/404");
  await expect(
    page.locator('head meta[name="robots"][content="noindex"]'),
  ).toHaveCount(1);
  await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
  // The copy and its single way back are unchanged.
  await expect(page.locator('main a[href="/"]')).toHaveCount(1);
});

test("node chips are real links without JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-node="deckos"]').first()).toHaveAttribute(
    "href",
    "/deckos",
  );
});

// Strengthened / centrepiece: the brief checks one chip's href attribute.
// That proves the markup is right but not that the link actually works with
// no JS attached — an href with a click handler elsewhere that calls
// preventDefault(), or a base-tag/router quirk, would still pass an
// attribute check. This clicks a real chip with JavaScript off and confirms
// a full navigation actually lands on the right prerendered page.
test("clicking a node chip with JavaScript off performs a real navigation", async ({
  page,
}) => {
  await page.goto("/");
  // The map renders twice (desktop and mobile coordinates), and CSS shows
  // only one instance per viewport — `:visible` follows whichever instance
  // this project's viewport actually renders, so the test exercises the
  // real user-visible chip on both the desktop and mobile projects instead
  // of always the desktop copy regardless of viewport.
  await page.locator('[data-node="gruntify"]:visible').click();

  await expect(page).toHaveURL("/gruntify");
  await expect(page.locator('[data-panel="gruntify"]')).toHaveAttribute(
    "data-active",
    "",
  );
});

// Standing ruling on this project: the career-years figure and the status
// word are server-rendered precisely so crawlers and JS-disabled visitors
// see them — never an empty element waiting for a script that won't run.
test("the career-years figure is server-rendered and non-empty", async ({
  page,
}, testInfo) => {
  // The "N nodes · M edges · uptime X yrs" line is desktop-only UI — the
  // mobile map replaces that footer with pan/zoom instructions by design,
  // so [data-career-years] is never the visible instance on the mobile
  // project's viewport. Assert it where it is actually meant to render.
  test.skip(
    testInfo.project.name !== "desktop",
    "the uptime footer line only renders visibly on the desktop map",
  );

  await page.goto("/");
  const years = page.locator("[data-career-years]");
  await expect(years).toBeVisible();
  const text = (await years.textContent())?.trim() ?? "";
  expect(text.length).toBeGreaterThan(0);
  expect(Number(text)).toBeGreaterThan(0);
});

test("the status word is server-rendered and non-empty on every route", async ({
  page,
}) => {
  for (const [path] of ROUTES) {
    await page.goto(path);
    const status = page.locator("[data-status]").first();
    const text = (await status.textContent())?.trim() ?? "";
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("currently");
  }
});

/**
 * The mobile rendition puts the reading panel in an overlay sheet whose
 * open state is derived from the URL. That derivation has to hold with no
 * script at all, or the per-node static pages — the reason this rebuild
 * exists — would degrade to a map with no way to read anything.
 *
 * The sheet's markup carries the server's answer for the route, and a
 * `:target` rule covers the one state a path alone cannot express: the
 * core node open, at `/#ben`. Both halves are exercised here because both
 * are load-bearing and neither involves JavaScript.
 */
test.describe("the reading sheet without JavaScript", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile",
      "the sheet is the mobile rendition of the panel",
    );
  });

  test("/ serves the map with the sheet closed", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-sheet]")).toHaveCount(1);
    await expect(page.locator("[data-sheet]")).toBeHidden();
  });

  test("a node route serves its sheet open", async ({ page }) => {
    await page.goto("/gruntify");
    await expect(page.locator("[data-sheet]")).toBeVisible();
    await expect(page.locator('[data-panel="gruntify"]')).toBeVisible();
  });

  test("/#ben opens the core node's sheet", async ({ page }) => {
    await page.goto("/#ben");
    await expect(page.locator("[data-sheet]")).toBeVisible();
    await expect(page.locator('[data-panel="ben"]')).toBeVisible();
  });

  test("the core node's chip links to the fragment that opens it", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('#bpGM [data-node="ben"]')).toHaveAttribute(
      "href",
      "/#ben",
    );
  });

  test("the close control is a real link back to the map", async ({ page }) => {
    await page.goto("/gruntify");
    await page.locator("[data-sheet-close]").click();

    await expect(page).toHaveURL("/");
    await expect(page.locator("[data-sheet]")).toBeHidden();
  });

  test("the close control also clears the fragment", async ({ page }) => {
    await page.goto("/#ben");
    await page.locator("[data-sheet-close]").click();

    await expect(page.locator("[data-sheet]")).toBeHidden();
  });
});
