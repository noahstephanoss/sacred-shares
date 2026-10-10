import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/AppNav";

export const Route = createFileRoute("/discernment")({
  head: () => ({
    meta: [
      { title: "Discernment — Testimonies" },
      { name: "description", content: "Talk through what you're facing and seek wisdom." },
      { property: "og:title", content: "Discernment — Testimonies" },
      { property: "og:description", content: "Talk through what you're facing and seek wisdom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ComingSoon title="Discernment" />
    </PageShell>
  ),
});
