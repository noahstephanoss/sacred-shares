import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/AppNav";

export const Route = createFileRoute("/burdens")({
  head: () => ({
    meta: [
      { title: "Burdens — Testimonies" },
      { name: "description", content: "Bring what you're carrying and let others sit with you." },
      { property: "og:title", content: "Burdens — Testimonies" },
      { property: "og:description", content: "Bring what you're carrying and let others sit with you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ComingSoon title="Burdens" />
    </PageShell>
  ),
});
