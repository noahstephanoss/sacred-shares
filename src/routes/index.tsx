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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center">
        <h1
          className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Testimonies
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          A place to share your spiritual journey, seek righteous counsel, and grow in faith with a community rooted in truth.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-8 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Sign In
          </Link>
        </div>

        {/* Quick nav */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
          <Link to="/feed" className="text-primary hover:underline">
            Feed
          </Link>
          <span className="text-border">·</span>
          <Link to="/discernment" className="text-primary hover:underline">
            Discernment Bot
          </Link>
          <span className="text-border">·</span>
          <Link to="/thinkers" className="text-primary hover:underline">
            Thinkers
          </Link>
        </div>
      </div>
    </div>
  );
}
