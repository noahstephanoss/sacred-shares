import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/check-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  head: () => ({
    meta: [{ title: "Check Your Email — Testimonies" }],
  }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-4xl" style={{ color: "#B8860B" }}>✉️</div>
        <h1
          className="mt-4 text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Check your email
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a confirmation link{email ? ` to ${email}` : ""}. Click it to activate your
          account, then come back and sign in.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
