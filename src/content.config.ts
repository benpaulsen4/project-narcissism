import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const nodes = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/nodes" }),
  schema: ({ image }) =>
    z.object({
      label: z.string(),
      kind: z.enum(["core", "capability", "project", "job", "education"]),
      order: z.number(),
      meta: z.string(),
      eyebrow: z.string(),
      pos: z.object({ x: z.number(), y: z.number() }),
      posMobile: z.object({ x: z.number(), y: z.number() }).optional(),
      wiredTo: z.array(z.string()).default([]),
      tags: z.array(z.string()).optional(),
      stack: z.string().optional(),
      stats: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .optional(),
      highlights: z
        .array(z.object({ label: z.string(), body: z.string() }))
        .optional(),
      previous: z
        .array(z.object({ name: z.string(), role: z.string() }))
        .optional(),
      links: z
        .array(
          z.object({
            label: z.string(),
            href: z.string().optional(),
            accent: z.boolean().default(false),
          })
        )
        .default([]),
      screenshot: image().optional(),
      seo: z.object({ title: z.string(), description: z.string() }),
    }),
});

export const collections = { nodes };
