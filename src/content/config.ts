import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		projects: z.array(z.string()).default([]),
		published: z.coerce.date(),
		updated: z.preprocess(v => v === "" || v === null ? undefined : v, z.coerce.date().optional()),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), description: z.string(),
    status: z.string().default('开发中'), featured: z.boolean().default(false),
    draft: z.boolean().default(false), image: z.string().default(''),
    tags: z.array(z.string()).default([]),
    repository: z.preprocess(v => v === "" || v === null ? undefined : v, z.string().url().optional()),
    downloads: z.array(z.object({ label: z.string(), url: z.string().url(), version: z.string().optional(), size: z.string().optional() })).default([]),
  }),
});
export const collections = {
  projects: projectsCollection,
	posts: postsCollection,
	spec: specCollection,
};
