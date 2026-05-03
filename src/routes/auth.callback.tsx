import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          return;
        }

        if (data.session) {
          navigate({ to: "/feed" });
        } else {
          // No session yet — listen for the auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (session) {
                subscription.unsubscribe();
                navigate({ to: "/feed" });
              }
            }
          );

          // Timeout fallback
          setTimeout(() => {
            subscription.unsubscribe();
            setError("Session could not be established. Please sign in manually.");
          }, 5000);
        }
      } catch {
        setError("An unexpected error occurred.");
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Something went wrong
          </h1>
          <p className="mt-4 text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Confirming your account...</p>
      </div>
    </div>
  );
}