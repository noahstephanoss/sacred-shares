import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { analyzeThinkerPost } from "@/lib/ai";

export const Route = createFileRoute("/thinkers")({
  head: () => ({
    meta: [
      { title: "Thinkers — Testimonies" },
      { name: "description", content: "Share your thoughts and struggles. Get a spiritual attack strength assessment." },
    ],
  }),
  component: ThinkersPage,
});

type AnalysisResult = {
  content: string;
  attack_rating: number;
  analysis: string;
};

function getRatingColor(rating: number) {
  if (rating <= 3) return { bg: "bg-green-100", bar: "bg-green-500", text: "text-green-700", label: "Light resistance" };
  if (rating <= 6) return { bg: "bg-amber-100", bar: "bg-amber-500", text: "text-amber-700", label: "Moderate warfare" };
  return { bg: "bg-red-100", bar: "bg-red-500", text: "text-red-700", label: "Heavy assault" };
}

function ThinkersPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const result = await analyzeThinkerPost(content.trim());
      setResults((prev) => [
        { content: content.trim(), ...result },
        ...prev,
      ]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              Thinkers
            </h1>
            <p className="text-sm text-muted-foreground">Share your struggle. Know your battlefield.</p>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Post form */}
        <div className="rounded-xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What thought or struggle is weighing on you?"
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze Spiritual Attack"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="mt-8 space-y-4">
          {results.map((r, i) => {
            const color = getRatingColor(r.attack_rating);
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm text-foreground leading-relaxed">{r.content}</p>

                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${color.text}`}>
                      {r.attack_rating}/10
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${color.bg} ${color.text}`}>
                      {color.label}
                    </span>
                  </div>

                  {/* Rating bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                      style={{ width: `${r.attack_rating * 10}%` }}
                    />
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {r.analysis}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}