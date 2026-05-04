import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Testimonies — A Faith-Based Community" },
      { name: "description", content: "Share your spiritual journey, seek counsel, and grow in faith together." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 overflow-hidden">
      {/* Subtle radial light rays */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(146,64,14,0.05) 0%, transparent 70%)",
        }}
      />
      {/* Faint cross */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 46%, #92400E 46%, #92400E 54%, transparent 54%), linear-gradient(to right, transparent 48.5%, #92400E 48.5%, #92400E 51.5%, transparent 51.5%)",
          backgroundSize: "100% 100%",
        }}
      />

      <div className="relative z-10 max-w-3xl text-center py-24">
        <h1
          className="text-6xl font-bold tracking-tight sm:text-8xl"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Testimonies
        </h1>
        <p
          className="mt-6 text-lg leading-relaxed sm:text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          A place to share your spiritual journey, seek righteous counsel, and grow in faith with a community rooted in truth.
        </p>

        {/* Scripture */}
        <div className="mx-auto mt-10 max-w-xl">
          <div className="mx-auto mb-4 h-px w-24" style={{ backgroundColor: "var(--border)" }} />
          <blockquote
            className="text-sm italic leading-relaxed sm:text-base"
            style={{ fontFamily: "'Georgia', serif", color: "var(--muted-foreground)" }}
          >
            "For just as each of us has one body with many members, and these members do not all have the same function, so in Christ we, though many, form one body, and each member belongs to all the others."
            <footer className="mt-2 text-xs not-italic tracking-widest uppercase" style={{ color: "#B8860B" }}>
              — Romans 12:4-5
            </footer>
          </blockquote>
          <div className="mx-auto mt-4 h-px w-24" style={{ backgroundColor: "var(--border)" }} />
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-10 py-3.5 text-sm font-semibold tracking-wide text-primary-foreground transition-colors hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-primary px-10 py-3.5 text-sm font-semibold tracking-wide text-primary transition-colors hover:bg-primary/10"
          >
            Sign In
          </Link>
        </div>

        {/* Quick nav */}
        <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm">
          <Link to="/feed" className="text-foreground transition-colors hover:underline hover:decoration-primary hover:underline-offset-4">
            Feed
          </Link>
          <span style={{ color: "#B8860B" }}>·</span>
          <Link to="/discernment" className="text-foreground transition-colors hover:underline hover:decoration-primary hover:underline-offset-4">
            Discernment Bot
          </Link>
          <span style={{ color: "#B8860B" }}>·</span>
          <Link to="/thinkers" className="text-foreground transition-colors hover:underline hover:decoration-primary hover:underline-offset-4">
            Thinkers
          </Link>
          <span style={{ color: "#B8860B" }}>·</span>
          <Link to="/blog" className="text-foreground transition-colors hover:underline hover:decoration-primary hover:underline-offset-4">
            Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
