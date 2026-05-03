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
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(146,64,14,0.08) 0%, transparent 70%)",
        }}
      />
      {/* Faint cross */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 46%, #F5F0E8 46%, #F5F0E8 54%, transparent 54%), linear-gradient(to right, transparent 48.5%, #F5F0E8 48.5%, #F5F0E8 51.5%, transparent 51.5%)",
          backgroundSize: "100% 100%",
        }}
      />

      <div className="relative z-10 max-w-3xl text-center py-24">
        <h1
          className="text-6xl font-bold tracking-tight sm:text-8xl"
          style={{ fontFamily: "'Georgia', serif", color: "#F5F0E8" }}
        >
          Testimonies
        </h1>
        <p
          className="mt-6 text-lg leading-relaxed sm:text-xl"
          style={{ color: "#A8998A" }}
        >
          A place to share your spiritual journey, seek righteous counsel, and grow in faith with a community rooted in truth.
        </p>
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md px-10 py-3.5 text-sm font-semibold tracking-wide transition-colors hover:opacity-90"
            style={{ backgroundColor: "#92400E", color: "#F5F0E8" }}
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border px-10 py-3.5 text-sm font-semibold tracking-wide transition-colors hover:bg-white/5"
            style={{ borderColor: "#F5F0E8", color: "#F5F0E8", backgroundColor: "transparent" }}
          >
            Sign In
          </Link>
        </div>

        {/* Quick nav */}
        <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm">
          <Link
            to="/feed"
            className="transition-colors hover:underline hover:decoration-primary hover:underline-offset-4"
            style={{ color: "#F5F0E8" }}
          >
            Feed
          </Link>
          <span style={{ color: "#A8998A" }}>·</span>
          <Link
            to="/discernment"
            className="transition-colors hover:underline hover:decoration-primary hover:underline-offset-4"
            style={{ color: "#F5F0E8" }}
          >
            Discernment Bot
          </Link>
          <span style={{ color: "#A8998A" }}>·</span>
          <Link
            to="/thinkers"
            className="transition-colors hover:underline hover:decoration-primary hover:underline-offset-4"
            style={{ color: "#F5F0E8" }}
          >
            Thinkers
          </Link>
          <span style={{ color: "#A8998A" }}>·</span>
          <Link
            to="/blog"
            className="transition-colors hover:underline hover:decoration-primary hover:underline-offset-4"
            style={{ color: "#F5F0E8" }}
          >
            Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
