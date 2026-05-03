import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/check-email")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Check Your Email — Testimonies" },
      { name: "description", content: "We sent you a confirmation email. Please check your inbox." },
    ],
  }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <h1
          className="text-3xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Check your email
        </h1>

        <p className="mt-4 text-muted-foreground leading-relaxed">
          We sent a confirmation link to{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "your email address"
          )}
          . Click the link in the email to activate your account.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-left">
          <h2 className="text-sm font-semibold text-foreground">Didn&apos;t get the email?</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure you entered the correct email</li>
            <li>• Wait a few minutes and try again</li>
          </ul>
        </div>

        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}