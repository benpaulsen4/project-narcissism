import { describe, expect, it } from "vitest";
import {
  assertGraphIntegrity,
  buildEdges,
  edgeKey,
  neighbourIds,
  wiredToLabel,
  type GraphNode,
} from "../src/lib/graph";

const nodes: GraphNode[] = [
  {
    id: "ben",
    label: "ben.paulsen",
    kind: "core",
    order: 0,
    wiredTo: ["frontend", "backend", "platform", "product", "qut"],
  },
  {
    id: "frontend",
    label: "frontend",
    kind: "capability",
    order: 1,
    wiredTo: [],
  },
  {
    id: "backend",
    label: "backend",
    kind: "capability",
    order: 2,
    wiredTo: [],
  },
  {
    id: "platform",
    label: "platform",
    kind: "capability",
    order: 3,
    wiredTo: [],
  },
  {
    id: "product",
    label: "product",
    kind: "capability",
    order: 4,
    wiredTo: [],
  },
  {
    id: "deckos",
    label: "DeckOS",
    kind: "project",
    order: 1,
    wiredTo: ["frontend", "backend", "platform"],
  },
  {
    id: "watchthis",
    label: "WatchThis",
    kind: "project",
    order: 2,
    wiredTo: ["frontend", "backend"],
  },
  {
    id: "api-workshop",
    label: "API Workshop",
    kind: "project",
    order: 3,
    wiredTo: ["frontend", "platform"],
  },
  {
    id: "imperfections",
    label: "Imperfections",
    kind: "project",
    order: 4,
    wiredTo: ["frontend"],
  },
  {
    id: "gruntify",
    label: "Gruntify",
    kind: "job",
    order: 1,
    wiredTo: ["frontend", "backend", "platform", "product"],
  },
  { id: "qut", label: "QUT", kind: "education", order: 1, wiredTo: [] },
];

describe("buildEdges", () => {
  it("produces the design's seventeen edges", () => {
    expect(buildEdges(nodes)).toHaveLength(17);
  });

  it("produces no duplicate edges regardless of direction", () => {
    const keys = buildEdges(nodes).map(edgeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("deduplicates an edge declared from both ends", () => {
    const both: GraphNode[] = [
      { id: "a", label: "A", kind: "core", order: 0, wiredTo: ["b"] },
      { id: "b", label: "B", kind: "capability", order: 1, wiredTo: ["a"] },
    ];
    expect(buildEdges(both)).toHaveLength(1);
  });
});

describe("edgeKey", () => {
  it("formats as a space-separated pair for the data-edge attribute", () => {
    expect(edgeKey({ a: "ben", b: "frontend" })).toBe("ben frontend");
  });
});

describe("neighbourIds", () => {
  it("finds neighbours declared from the other end", () => {
    expect(neighbourIds(nodes, "frontend")).toContain("deckos");
  });

  it("finds neighbours declared from this end", () => {
    expect(neighbourIds(nodes, "deckos")).toContain("platform");
  });
});

describe("wiredToLabel", () => {
  it("matches the design for a capability — job first, then projects newest to oldest, core excluded", () => {
    expect(wiredToLabel(nodes, "frontend")).toBe(
      "Gruntify · DeckOS · WatchThis · API Workshop · Imperfections"
    );
  });

  it("matches the design for backend", () => {
    expect(wiredToLabel(nodes, "backend")).toBe(
      "Gruntify · DeckOS · WatchThis"
    );
  });

  it("matches the design for platform", () => {
    expect(wiredToLabel(nodes, "platform")).toBe(
      "Gruntify · DeckOS · API Workshop"
    );
  });

  it("matches the design for product", () => {
    expect(wiredToLabel(nodes, "product")).toBe("Gruntify");
  });

  it("matches the design for a project — capabilities in canonical order", () => {
    expect(wiredToLabel(nodes, "deckos")).toBe("frontend · backend · platform");
  });

  it("matches the design for the job", () => {
    expect(wiredToLabel(nodes, "gruntify")).toBe(
      "frontend · backend · platform · product"
    );
  });

  it("falls back to core when core is the only neighbour", () => {
    expect(wiredToLabel(nodes, "qut")).toBe("ben.paulsen");
  });
});

describe("assertGraphIntegrity", () => {
  it("passes for the real graph", () => {
    expect(() => assertGraphIntegrity(nodes)).not.toThrow();
  });

  it("throws naming the offending id and node", () => {
    const broken: GraphNode[] = [
      { id: "ben", label: "ben", kind: "core", order: 0, wiredTo: ["ghost"] },
    ];
    expect(() => assertGraphIntegrity(broken)).toThrow(/ghost/);
  });
});
