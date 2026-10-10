import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppNav";
import { useSession } from "@/components/AuthProvider";
import { useCrisisCheck } from "@/components/CrisisSupport";
import { ReportButton } from "@/components/ReportButton";
import { StruggleTagPicker, saveStruggleTags, emptyTags, type TagSelection } from "@/components/StruggleTags";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Testimonies" },
      { name: "description", content: "Read and share testimonies with the community." },
      { property: "og:title", content: "Home — Testimonies" },
      { property: "og:description", content: "Read and share testimonies with the community." },
    ],
  }),
  component: HomePage,
});

type Testimony = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
};

const REACTIONS = [
  { type: "praying", emoji: "🙏", label: "Praying" },
  { type: "amen", emoji: "✝️", label: "Amen" },
  { type: "peace", emoji: "🕊️", label: "Peace" },
] as const;

function HomePage() {
  const { user, requireAuth } = useSession();
  const userId = user?.id ?? null;
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [tags, setTags] = useState<TagSelection>(emptyTags);
  const { check, modal } = useCrisisCheck();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: rows } = await supabase
      .from("testimonies")
      .select("id, user_id, body, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (rows ?? []) as Omit<Testimony, "author_name">[];
    const authorIds = [...new Set(list.map((t) => t.user_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds)
      : { data: [] };
    const nameById = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));
    setTestimonies(
      list.map((t) => ({ ...t, author_name: nameById.get(t.user_id) || "Anonymous" }))
    );

    const ids = list.map((t) => t.id);
    if (ids.length) {
      const { data: rx } = await supabase
        .from("testimony_reactions")
        .select("testimony_id, type, user_id")
        .in("testimony_id", ids);
      const counts: Record<string, Record<string, number>> = {};
      const mine: Record<string, string> = {};
      for (const r of rx ?? []) {
        counts[r.testimony_id] = counts[r.testimony_id] ?? {};
        counts[r.testimony_id][r.type] = (counts[r.testimony_id][r.type] ?? 0) + 1;
        if (userId && r.user_id === userId) mine[r.testimony_id] = r.type;
      }
      setReactions(counts);
      setMyReactions(mine);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !body.trim()) return;
    check(body, submitPost);
  };

  const submitPost = async () => {
    if (!userId) return;
    setPosting(true);
    const { data: created, error } = await supabase.from("testimonies").insert({
      user_id: userId,
      title: body.trim().slice(0, 60),
      body: body.trim(),
      is_public: true,
    }).select("id").single();
    if (!error && created) {
      await saveStruggleTags({ postType: "testimony", postId: created.id, userId, isPublic: true, sel: tags });
    }
    setPosting(false);
    if (!error) {
      setBody("");
      setTags(emptyTags);
      load();
    }
  };

  const toggleReaction = async (testimonyId: string, type: string) => {
    if (!requireAuth() || !userId) return;
    const existing = myReactions[testimonyId];
    if (existing === type) {
      await supabase
        .from("testimony_reactions")
        .delete()
        .eq("testimony_id", testimonyId)
        .eq("user_id", userId);
    } else {
      if (existing) {
        await supabase
          .from("testimony_reactions")
          .delete()
          .eq("testimony_id", testimonyId)
          .eq("user_id", userId);
      }
      await supabase.from("testimony_reactions").insert({
        testimony_id: testimonyId,
        user_id: userId,
        type,
      });
    }
    load();
  };

  return (
    <PageShell>
        {userId ? (
          <form
            onSubmit={handlePost}
            className="mb-8 rounded-lg border border-border/70 bg-card px-6 py-5 shadow-sm"
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What is God doing in your life today?"
              rows={3}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <StruggleTagPicker value={tags} onChange={setTags} />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={posting || !body.trim()}
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {posting ? "Sharing..." : "Share testimony"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 rounded-lg border border-border/70 bg-card px-6 py-5 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              <button type="button" onClick={requireAuth} className="font-medium text-primary hover:underline">
                Sign in
              </button>{" "}
              to share your testimony and react to others.
            </p>
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : testimonies.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl text-gold">✝</div>
            <p
              className="mt-4 font-serif text-sm italic text-muted-foreground"
            >
              No testimonies yet. You can be the first to share what God has done.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonies.map((t) => (
              <article
                key={t.id}
                className="rounded-lg border border-border/70 bg-card px-6 py-5 shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span
                    className="font-serif text-sm font-semibold text-foreground"
                  >
                    {t.author_name}
                  </span>
                  <time className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {t.body}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {REACTIONS.map((r) => {
                    const count = reactions[t.id]?.[r.type] ?? 0;
                    const active = myReactions[t.id] === r.type;
                    return (
                      <button
                        key={r.type}
                        onClick={() => toggleReaction(t.id, r.type)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        } disabled:opacity-60`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.label}</span>
                        {count > 0 && <span className="font-medium">{count}</span>}
                      </button>
                    );
                  })}
                  <span className="ml-auto">
                    <ReportButton type="testimony" id={t.id} ownerId={t.user_id} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      {modal}
    </PageShell>
  );
}
