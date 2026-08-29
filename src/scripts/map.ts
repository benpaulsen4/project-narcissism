type Cleanup = () => void;

const PANEL_SELECTOR = "[data-panel]";
const NODE_SELECTOR = "[data-node]";
const EDGE_SELECTOR = "[data-edge]";
const SHEET_SELECTOR = "[data-sheet]";
const SURFACE_SELECTOR = "[data-sheet-surface]";
const CLOSE_SELECTOR = "[data-sheet-close]";

/**
 * What the URL is asking to be shown.
 *
 * `open` only renders below the desktop breakpoint, where the panel is an
 * overlay sheet rather than the grid's second column — but it is tracked at
 * every width so both renditions run off one state machine rather than two.
 */
interface View {
  id: string;
  open: boolean;
}

/**
 * The URL a view is addressed by.
 *
 *   /          the map, sheet closed
 *   /#ben      the core node, sheet open
 *   /<node>    that node, sheet open
 *
 * The core node needs a fragment because `/` is its canonical URL *and*
 * the mobile rendition's "closed" state, and one URL cannot mean both.
 * Above the breakpoint there is no sheet and so no collision, and `/` is
 * left alone rather than having a fragment invented for it.
 */
function urlFor(view: View, narrow: boolean): string {
  if (!view.open) return "/";
  if (view.id !== "ben") return `/${view.id}`;
  return narrow ? "/#ben" : "/";
}

/** The inverse of {@link urlFor}, for a cold load or a history traversal. */
function viewFor(url: { pathname: string; hash: string }): View {
  const path = url.pathname.replace(/\/+$/, "");
  if (path !== "") return { id: path.slice(1), open: true };
  return { id: "ben", open: url.hash === "#ben" };
}

/**
 * Matches the same width the stylesheet hides and shows the sheet at.
 *
 * `--breakpoint-desktop` in global.css is the single source of truth for
 * that width, and Tailwind emits it as a real custom property, so it can be
 * read back here instead of being restated as a literal that would silently
 * drift the day the breakpoint moves.
 */
function narrowQuery(): MediaQueryList {
  const width = getComputedStyle(document.documentElement)
    .getPropertyValue("--breakpoint-desktop")
    .trim();
  return window.matchMedia(`(width < ${width || "1152px"})`);
}

export function initMap(): Cleanup {
  // Stand down the `:target` fallback in global.css. It exists so `/#ben`
  // opens the sheet with no JavaScript; with the island running it would be
  // a second, unsynchronised source of truth, because `history.pushState`
  // does not reliably update the document's indicated part — a sheet closed
  // from a cold `/#ben` load could stay held open by a fragment the URL no
  // longer carries. Set before the early return below: the fallback must be
  // withdrawn whenever this module runs at all.
  document.documentElement.dataset.js = "";

  const nodes = [...document.querySelectorAll<HTMLElement>(NODE_SELECTOR)];
  const edges = [...document.querySelectorAll<SVGLineElement>(EDGE_SELECTOR)];
  const panels = [...document.querySelectorAll<HTMLElement>(PANEL_SELECTOR)];
  if (nodes.length === 0 || panels.length === 0) return () => {};

  const sheet = document.querySelector<HTMLElement>(SHEET_SELECTOR);
  const closer = document.querySelector<HTMLElement>(CLOSE_SELECTOR);
  const narrow = narrowQuery();

  const edgePairs = new Map(
    edges.map((edge) => [edge, (edge.dataset.edge ?? "").split(" ")]),
  );

  let current = viewFor(window.location);
  // The chip a scripted open came from, so closing can hand focus back to
  // it rather than dropping it at the top of the document.
  let opener: HTMLElement | null = null;

  /** Highlight the edges touching `id`, dim the rest. `null` clears. */
  const trace = (id: string | null) => {
    for (const edge of edges) {
      const pair = edgePairs.get(edge) ?? [];
      const on = id === null || pair.includes(id);
      edge.toggleAttribute("data-traced", id !== null && on);
      edge.toggleAttribute("data-dimmed", !on);
    }

    for (const node of nodes) {
      const nodeId = node.dataset.node ?? "";
      const related =
        id === null ||
        nodeId === id ||
        edges.some((edge) => {
          const pair = edgePairs.get(edge) ?? [];
          return pair.includes(id) && pair.includes(nodeId);
        });
      node.toggleAttribute("data-dimmed", !related);
    }
  };

  const select = (view: View, { push }: { push: boolean }) => {
    current = view;

    for (const panel of panels) {
      const on = panel.dataset.panel === view.id;
      panel.toggleAttribute("data-active", on);
      panel.toggleAttribute("inert", !on);
      if (on) panel.scrollTop = 0;
    }

    for (const node of nodes) {
      node.toggleAttribute("data-active", node.dataset.node === view.id);
    }

    // Inert is not toggled on the sheet itself: below the breakpoint a
    // closed sheet is `visibility: hidden`, which already takes the active
    // panel out of the tab order and the accessibility tree, and above it
    // the sheet is the permanently visible panel column.
    sheet?.toggleAttribute("data-open", view.open);

    if (push) history.pushState(view, "", urlFor(view, narrow.matches));
    trace(view.id === "ben" ? null : view.id);
  };

  const open = (id: string, from: HTMLElement | null) => {
    opener = from;
    select({ id, open: true }, { push: true });
    // Only on a scripted open — a cold load must not steal focus from the
    // top of the document.
    //
    // On the next frame, not this one: `data-open` has only just been set,
    // and until the style recalculation it implies has run the sheet is
    // still `visibility: hidden`, which makes everything inside it
    // unfocusable and turns this into a silent no-op.
    if (narrow.matches) {
      requestAnimationFrame(() => closer?.focus({ preventScroll: true }));
    }
  };

  const close = () => {
    select({ id: "ben", open: false }, { push: true });
    opener?.focus({ preventScroll: true });
    opener = null;
  };

  const onClick = (event: MouseEvent) => {
    // Let the browser handle modified clicks — new tab, new window, download.
    if (event.defaultPrevented) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;

    const target = event.target as Element | null;

    // The close control is a real link to `/` so that it works with no
    // script; with one, closing is a history entry at the same position
    // rather than a page load, so back reopens what was being read.
    if (target?.closest(CLOSE_SELECTOR)) {
      event.preventDefault();
      close();
      return;
    }

    // The gap above the sheet is the other dismiss target. Guarded on the
    // viewport because above the breakpoint this element is the panel
    // column, where a stray click must not close anything.
    if (
      narrow.matches &&
      current.open &&
      target?.closest(SHEET_SELECTOR) &&
      !target.closest(SURFACE_SELECTOR)
    ) {
      close();
      return;
    }

    // The mobile map's pan/zoom (panzoom.ts) calls setPointerCapture on
    // every pointerdown, including a plain tap/click that never turns into
    // a drag. For a *mouse*-originated click (not a touch tap — those are
    // unaffected), Chromium retargets the compatibility `click` event's
    // `target` to the capturing element itself rather than wherever the
    // pointer actually released, so `event.target.closest(...)` misses the
    // node entirely and the click silently does nothing. Falling back to a
    // hit-test at the real coordinates recovers the actual target; the
    // data-dragged guard right below still runs on whatever node this
    // finds, so a genuine drag stays blocked either way.
    const node =
      target?.closest<HTMLElement>(NODE_SELECTOR) ??
      document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>(NODE_SELECTOR) ??
      null;
    if (!node) return;

    // A pan gesture on mobile ends in a click; ignore it.
    const inner = node.closest<HTMLElement>("[data-map-inner]");
    if (inner?.dataset.dragged === "1") {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    open(node.dataset.node ?? "ben", node);
  };

  const onEnter = (event: PointerEvent) => {
    const node = (event.target as Element | null)?.closest<HTMLElement>(
      NODE_SELECTOR,
    );
    if (!node || event.pointerType !== "mouse") return;
    trace(node.dataset.node === "ben" ? null : (node.dataset.node ?? null));
  };

  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;

    const node = (event.target as Element | null)?.closest<HTMLElement>(
      NODE_SELECTOR,
    );
    if (!node) return;

    // Ignore boundary crossings within the same chip (e.g. span -> a).
    const related = event.relatedTarget as Element | null;
    if (related && node.contains(related)) return;

    trace(current.id === "ben" ? null : current.id);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (!narrow.matches || !current.open) return;
    close();
  };

  const onPop = () => select(viewFor(window.location), { push: false });

  /**
   * Below the breakpoint the panel is an overlay over the map, which is a
   * dialog; above it, it is a permanent region of the page. The role is
   * therefore a property of the rendition and has to follow a resize.
   * `aria-modal` is deliberately absent: focus is moved into the sheet and
   * handed back on close, but it is not trapped, and claiming otherwise
   * would misdescribe what actually happens.
   */
  const syncRole = () => {
    if (!sheet) return;
    if (narrow.matches) {
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-label", "Reading panel");
    } else {
      sheet.removeAttribute("role");
      sheet.removeAttribute("aria-label");
    }
  };

  document.addEventListener("click", onClick);
  document.addEventListener("pointerover", onEnter);
  document.addEventListener("pointerout", onLeave);
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPop);
  narrow.addEventListener("change", syncRole);

  syncRole();
  // Sync in-memory state with the server-rendered active panel.
  select(current, { push: false });
  history.replaceState(current, "", urlFor(current, narrow.matches));

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("pointerover", onEnter);
    document.removeEventListener("pointerout", onLeave);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("popstate", onPop);
    narrow.removeEventListener("change", syncRole);
  };
}
