import { getCollection } from "astro:content";
import { assertGraphIntegrity, type GraphNode } from "./graph";

export async function loadNodes() {
  const entries = await getCollection("nodes");

  const nodes = entries.map((entry) => ({
    id: entry.id,
    ...entry.data,
    entry,
  }));

  // Stable ordering: core first, then by kind order, then by the node's own order.
  const KIND_RANK = {
    core: 0,
    capability: 1,
    job: 2,
    project: 3,
    education: 4,
  };
  nodes.sort(
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.order - b.order,
  );

  assertGraphIntegrity(nodes as GraphNode[]);
  return nodes;
}

export type SiteNode = Awaited<ReturnType<typeof loadNodes>>[number];

/** The map renders twice, with genuinely different coordinates. */
export type MapVariant = "desktop" | "mobile";

/**
 * Where a node sits on one rendition of the map, as a fraction of the map's
 * width and height. Only some nodes are nudged for the narrow layout, so the
 * fallback to `pos` matters — and the chip centres and the edge endpoints
 * have to resolve it identically or the lines stop meeting the chips. Both
 * callers go through here so they cannot drift.
 */
export function posFor(node: SiteNode, variant: MapVariant) {
  return variant === "mobile" ? (node.posMobile ?? node.pos) : node.pos;
}
