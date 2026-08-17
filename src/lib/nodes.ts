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
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.order - b.order
  );

  assertGraphIntegrity(nodes as GraphNode[]);
  return nodes;
}

export type SiteNode = Awaited<ReturnType<typeof loadNodes>>[number];
