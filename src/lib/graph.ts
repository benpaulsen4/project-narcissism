export type NodeKind = "core" | "capability" | "project" | "job" | "education";

export type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  order: number;
  wiredTo: string[];
};

export type Edge = { a: string; b: string };

/** Order the "wired to →" line lists neighbours in. */
const KIND_ORDER: NodeKind[] = [
  "capability",
  "job",
  "project",
  "education",
  "core",
];

export function edgeKey(e: Edge): string {
  return `${e.a} ${e.b}`;
}

export function buildEdges(nodes: GraphNode[]): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];

  for (const node of nodes) {
    for (const target of node.wiredTo) {
      // Undirected: canonicalise the pair so a→b and b→a collapse to one edge.
      const [a, b] = [node.id, target].sort();
      const key = `${a} ${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: node.id, b: target });
    }
  }

  return edges;
}

export function neighbourIds(nodes: GraphNode[], id: string): string[] {
  const out = new Set<string>();
  for (const node of nodes) {
    if (node.id === id) {
      for (const t of node.wiredTo) out.add(t);
    } else if (node.wiredTo.includes(id)) {
      out.add(node.id);
    }
  }
  return [...out];
}

export function wiredToLabel(nodes: GraphNode[], id: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighbours = neighbourIds(nodes, id)
    .map((nid) => byId.get(nid))
    .filter((n): n is GraphNode => n !== undefined);

  const nonCore = neighbours.filter((n) => n.kind !== "core");
  // Education nodes wire only to the core, so fall back rather than render nothing.
  const listed = nonCore.length > 0 ? nonCore : neighbours;

  return listed
    .slice()
    .sort(
      (x, y) =>
        KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) ||
        x.order - y.order,
    )
    .map((n) => n.label)
    .join(" · ");
}

export function assertGraphIntegrity(nodes: GraphNode[]): void {
  const ids = new Set(nodes.map((n) => n.id));
  for (const node of nodes) {
    for (const target of node.wiredTo) {
      if (!ids.has(target)) {
        throw new Error(
          `Node "${node.id}" is wired to "${target}", which does not exist.`,
        );
      }
      if (target === node.id) {
        throw new Error(`Node "${node.id}" is wired to itself.`);
      }
    }
  }
}
