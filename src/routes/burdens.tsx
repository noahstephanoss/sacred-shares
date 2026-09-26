import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { EmptyState } from "@/components/EmptyState";

const TITLE = "Burdens — Share What You're Carrying | Testimonies";
const DESC = "Share what you're carrying, openly or anonymously, and let others carry it with you in prayer.";

export const Route = createFileRoute("/burdens")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BurdensPage,
});

interface Burden {
  id: string;
  body: string;
  is_anonymous: boolean;
  created_at: string;
  user_id: string | null;
  is_mine: boolean | null;
}
interface Author { display_name: string | null; avatar_url: string | null }

function BurdensPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [burdens, setBurdens] = useState<Burden[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("burdens_feed")
      .select("id, body, is_anonymous, created_at, user_id, is_mine")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Burden[];
    setBurdens(rows);
    const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const map: Record<string, Author> = {};
      (profs ?? []).forEach((p) => (map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }));
      setAuthors(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return openAuthPrompt();
    const text = body.trim();
    if (!text) return;
    if (text.length > 1000) return setError("Please keep it under 1000 characters.");
    setPosting(true);
    setError(null);
    const { error: err } = await (supabase as any)
      .from("burdens")
      .insert({ user_id: userId, body: text, is_anonymous: anon });
    setPosting(false);
    if (err) return setError("Couldn't share your burden. Please try again.");
    setBody("");
    setAnon(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this burden?")) return;
    const { error: err } = await (supabase as any).from("burdens").delete().eq("id", id);
    if (!err) setBurdens((b) => b.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Burdens</h1>
        <p className="mt-1 text-sm text-muted-foreground">"Carry each other's burdens" — Galatians 6:2</p>

        <form onSubmit={submit} className="mt-6 rounded-lg border border-border bg-card p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => { if (!userId) openAuthPrompt(); }}
            placeholder="What are you carrying right now?"
            aria-label="What are you carrying right now?"
            maxLength={1000}
            rows={4}
            className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="accent-primary" />
              Post anonymously
            </label>
            <button
              type="submit"
              disabled={posting || (!!userId && !body.trim())}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {posting ? "Sharing..." : "Share burden"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </form>

        <section className="mt-8 space-y-4">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">Loading...</p>
          ) : burdens.length === 0 ? (
            <EmptyState
              verse="Carry each other's burdens"
              reference="Galatians 6:2"
              description="No burdens shared yet. You can be the first to let someone carry this with you."
            />
          ) : (
            burdens.map((b) => {
              const a = b.user_id ? authors[b.user_id] : null;
              const name = b.is_anonymous ? "Anonymous" : a?.display_name || "Member";
              return (
                <article key={b.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-medium text-foreground">
                      {!b.is_anonymous && a?.avatar_url ? (
                        <img src={a.avatar_url} alt={name} className="h-full w-full object-cover" />
                      ) : b.is_anonymous ? "?" : name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
                    </div>
                    {b.is_mine && (
                      <button onClick={() => remove(b.id)} className="text-xs text-destructive hover:underline">Delete</button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground" style={{ fontFamily: "'Georgia', serif" }}>{b.body}</p>
                </article>
              );
            })
          )}
        </section>
      </main>
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}
