import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/AppNav";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Testimonies" },
      { name: "description", content: "Your Testimonies profile." },
      { property: "og:title", content: "Profile — Testimonies" },
      { property: "og:description", content: "Your Testimonies profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ComingSoon title="Profile" />
    </PageShell>
  ),
});
