import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { analyzeThinkerPost } from "@/lib/ai";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { supabase } from "@/integrations/supabase/client";

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
  saved?: boolean;
};

function getRatingColor(rating: number) {
  if (rating <= 3) return { bg: "bg-green-100", bar: "bg-green-500", text: "text-green-700", label: "Light resistance" };
  if (rating <= 6) return { bg: "bg-amber-100", bar: "bg-amber-500", text: "text-amber-700", label: "Moderate warfare" };
  return { bg: "bg-red-100", bar: "bg-red-500", text: "text-red-700", label: "Heavy assault" };
}

function ThinkersPage() {
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const { count, limit, remaining, isAtLimit, increment } = useDailyLimit("thinkers");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) { openAuthPrompt(); return; }
    if (!content.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const allowed = await increment();
      if (!allowed) {
        setError("You've reached your daily limit of 50 analyses. Come back tomorrow.");
        setLoading(false);
        return;
      }

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

  const handleSaveToArchive = useCallback(async (result: AnalysisResult, index: number) => {
    if (!userId) return;
    const { error } = await supabase.from("insight_archive").insert({
      user_id: userId,
      title: result.content.slice(0, 80),
      original_thought: result.content,
      ai_analysis: result.analysis,
      attack_rating: result.attack_rating,
    });
    if (!error) {
      setResults((prev) => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
    }
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-3xl px-4 py-4">
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Thinkers</h2>
        <p className="text-sm text-muted-foreground">Share your struggle. Know your battlefield.</p>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Post form */}
        <div className="rounded-xl border border-border bg-card p-6">
          {/* Daily usage progress bar */}
          <div className="mb-4">
            <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ backgroundColor: "#E7D5B3" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-in-out"
                style={{ backgroundColor: "#92400E", width: `${Math.max(0, ((limit - count) / limit) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground tracking-wide">Daily reflection limit</p>
          </div>
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

                  {/* Save to Archive */}
                  <button
                    type="button"
                    disabled={r.saved}
                    onClick={() => handleSaveToArchive(r, i)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: r.saved ? "#E7D5B3" : "transparent", color: "#92400E", border: "1px solid #92400E" }}
                  >
                    {r.saved ? "✓ Saved" : "Save to Archive"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}