import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/AppNav";
import { CrisisLines } from "@/components/CrisisSupport";

export const Route = createFileRoute("/get-help")({
  head: () => ({
    meta: [
      { title: "Get Help — Testimonies" },
      { name: "description", content: "Crisis lines, domestic violence help, support for families, and how to find a Christian counselor." },
      { property: "og:title", content: "Get Help — Testimonies" },
      { property: "og:description", content: "Crisis lines, domestic violence help, support for families, and how to find a Christian counselor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GetHelp,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border/70 bg-card px-6 py-5 shadow-sm">
      <h2 className="font-serif text-xl text-foreground">{title}</h2>
      <div className="mt-3 space-y-2 text-sm text-foreground">{children}</div>
    </section>
  );
}

function GetHelp() {
  return (
    <PageShell>
      <div className="text-center">
        <div className="text-3xl text-gold">✝</div>
        <h1 className="mt-3 font-serif text-3xl text-foreground">Get Help</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          You don't have to carry this alone. Testimonies is a place for support and prayer — it is not emergency help.
          If you're in danger, please reach out to one of these right now.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <Section title="If you're in crisis">
          <CrisisLines />
        </Section>

        <Section title="Domestic violence or abuse">
          <p>
            <strong>National Domestic Violence Hotline</strong> — call{" "}
            <a href="tel:18007997233" className="text-primary underline">1-800-799-7233</a> or text{" "}
            <a href="sms:88788&body=START" className="text-primary underline">START to 88788</a>. 24/7, confidential.
          </p>
          <p>
            <strong>Childhelp National Child Abuse Hotline</strong> —{" "}
            <a href="tel:18004224453" className="text-primary underline">1-800-422-4453</a>.
          </p>
        </Section>

        <Section title="When someone you love drinks or uses">
          <p>
            <strong>Al-Anon &amp; Alateen</strong> — support for families and teens affected by someone else's drinking.{" "}
            <a href="https://al-anon.org" target="_blank" rel="noreferrer" className="text-primary underline">al-anon.org</a>
          </p>
          <p>
            <strong>Celebrate Recovery</strong> — Christ-centered recovery groups in many churches.{" "}
            <a href="https://www.celebraterecovery.com" target="_blank" rel="noreferrer" className="text-primary underline">celebraterecovery.com</a>
          </p>
          <p>
            <strong>SAMHSA Helpline</strong> — free referrals, 24/7:{" "}
            <a href="tel:18006624357" className="text-primary underline">1-800-662-4357</a>.
          </p>
        </Section>

        <Section title="Finding a Christian counselor">
          <p>Talking with a trained counselor is a good and faithful step — not a sign of weak faith.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Ask your pastor or youth leader who they trust locally.</li>
            <li>
              Search the <a href="https://www.aacc.net" target="_blank" rel="noreferrer" className="text-primary underline">American Association of Christian Counselors</a>.
            </li>
            <li>
              Use the <a href="https://www.psychologytoday.com/us/therapists/christian" target="_blank" rel="noreferrer" className="text-primary underline">Psychology Today Christian counselor finder</a>.
            </li>
            <li>If you're under 18, a parent, school counselor, or trusted adult can help you get connected.</li>
          </ul>
        </Section>
      </div>
    </PageShell>
  );
}
