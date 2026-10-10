import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/AppNav";

export const Route = createFileRoute("/bible")({
  head: () => ({
    meta: [
      { title: "Bible — Testimonies" },
      { name: "description", content: "Read Scripture and reflect on it together." },
      { property: "og:title", content: "Bible — Testimonies" },
      { property: "og:description", content: "Read Scripture and reflect on it together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ComingSoon title="Bible" />
    </PageShell>
  ),
});
