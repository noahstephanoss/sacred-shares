import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/AppNav";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Testimonies" },
      { name: "description", content: "Notes and reflections from the founder of Testimonies." },
      { property: "og:title", content: "Blog — Testimonies" },
      { property: "og:description", content: "Notes and reflections from the founder of Testimonies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ComingSoon title="Blog" />
    </PageShell>
  ),
});
