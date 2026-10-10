import { createFileRoute, Link } from "@tanstack/react-router";
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
      <div className="mt-6 text-center">
        <Link to="/get-help" className="text-sm font-medium text-primary hover:underline">Need help? Get Help</Link>
      </div>
    </PageShell>
  ),
});
