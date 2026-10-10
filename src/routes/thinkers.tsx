import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/AppNav";

export const Route = createFileRoute("/thinkers")({
  head: () => ({
    meta: [
      { title: "Thinkers — Testimonies" },
      { name: "description", content: "Think through faith questions together, with grace and honesty." },
      { property: "og:title", content: "Thinkers — Testimonies" },
      { property: "og:description", content: "Think through faith questions together, with grace and honesty." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ComingSoon title="Thinkers" />
    </PageShell>
  ),
});
