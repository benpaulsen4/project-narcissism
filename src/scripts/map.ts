type Cleanup = () => void;

const PANEL_SELECTOR = "[data-panel]";
const NODE_SELECTOR = "[data-node]";
const EDGE_SELECTOR = "[data-edge]";

function pathFor(id: string): string {
  return id === "ben" ? "/" : `/${id}`;
}

function idFor(path: string): string {
  const clean = path.replace(/\/+$/, "");
  return clean === "" ? "ben" : clean.slice(1);
}

export function initMap(): Cleanup {
  const nodes = [...document.querySelectorAll<HTMLElement>(NODE_SELECTOR)];
  const edges = [...document.querySelectorAll<SVGLineElement>(EDGE_SELECTOR)];
  const panels = [...document.querySelectorAll<HTMLElement>(PANEL_SELECTOR)];
  if (nodes.length === 0 || panels.length === 0) return () => {};

  const edgePairs = new Map(
    edges.map((edge) => [edge, (edge.dataset.edge ?? "").split(" ")])
  );

  let current = idFor(window.location.pathname);

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

  const select = (id: string, { push }: { push: boolean }) => {
    current = id;

    for (const panel of panels) {
      const on = panel.dataset.panel === id;
      panel.toggleAttribute("data-active", on);
      panel.toggleAttribute("inert", !on);
      if (on) panel.scrollTop = 0;
    }

    for (const node of nodes) {
      node.toggleAttribute("data-active", node.dataset.node === id);
    }

    if (push) history.pushState({ id }, "", pathFor(id));
    trace(id === "ben" ? null : id);
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

    const node = (event.target as Element | null)?.closest<HTMLElement>(
      NODE_SELECTOR
    );
    if (!node) return;

    // A pan gesture on mobile ends in a click; ignore it.
    const inner = node.closest<HTMLElement>("[data-map-inner]");
    if (inner?.dataset.dragged === "1") {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    select(node.dataset.node ?? "ben", { push: true });
  };

  const onEnter = (event: PointerEvent) => {
    const node = (event.target as Element | null)?.closest<HTMLElement>(
      NODE_SELECTOR
    );
    if (!node || event.pointerType !== "mouse") return;
    trace(node.dataset.node === "ben" ? null : node.dataset.node ?? null);
  };

  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;

    const node = (event.target as Element | null)?.closest<HTMLElement>(
      NODE_SELECTOR
    );
    if (!node) return;

    // Ignore boundary crossings within the same chip (e.g. span -> a).
    const related = event.relatedTarget as Element | null;
    if (related && node.contains(related)) return;

    trace(current === "ben" ? null : current);
  };

  const onPop = () => select(idFor(window.location.pathname), { push: false });

  document.addEventListener("click", onClick);
  document.addEventListener("pointerover", onEnter);
  document.addEventListener("pointerout", onLeave);
  window.addEventListener("popstate", onPop);

  // Sync in-memory state with the server-rendered active panel.
  select(current, { push: false });
  history.replaceState({ id: current }, "", pathFor(current));

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("pointerover", onEnter);
    document.removeEventListener("pointerout", onLeave);
    window.removeEventListener("popstate", onPop);
  };
}
