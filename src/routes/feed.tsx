import { createFileRoute, redirect } from "@tanstack/react-router";

type LegacyFeedSearch = { burden?: string; testimony?: string };

export const Route = createFileRoute("/feed")({
  validateSearch: (search: Record<string, unknown>): LegacyFeedSearch => ({
    burden: typeof search.burden === "string" ? search.burden : undefined,
    testimony: typeof search.testimony === "string" ? search.testimony : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/home", search, replace: true });
  },
  head: () => ({
    meta: [
      { title: "Home — Testimonies" },
      { name: "description", content: "Read and share spiritual testimonies from the community." },
      { property: "og:title", content: "Home — Testimonies" },
      { property: "og:description", content: "Read and share spiritual testimonies from the community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});