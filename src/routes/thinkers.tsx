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

const PRESET_TAGS = [
  "Prayer", "Spiritual Warfare", "Scripture", "Temptation", "Relationships",
  "Identity", "Purpose", "Doubt", "Worship", "Repentance",
  "Healing", "Prophecy", "Family", "Work", "Sexuality",
] as const;

const TAG_SCRIPTURE_MAP: Record<string, { ref: string; apiRef: string }> = {
  "Doubt": { ref: "Philippians 4:6-7", apiRef: "Philippians+4:6-7" },
  "Temptation": { ref: "1 Corinthians 10:13", apiRef: "1+Corinthians+10:13" },
  "Spiritual Warfare": { ref: "Ephesians 6:12", apiRef: "Ephesians+6:12" },
  "Identity": { ref: "Psalm 139:14", apiRef: "Psalm+139:14" },
  "Healing": { ref: "Isaiah 53:5", apiRef: "Isaiah+53:5" },
  "Relationships": { ref: "1 Corinthians 13:4-7", apiRef: "1+Corinthians+13:4-7" },
  "Repentance": { ref: "1 John 1:9", apiRef: "1+John+1:9" },
  "Purpose": { ref: "Jeremiah 29:11", apiRef: "Jeremiah+29:11" },
  "Prayer": { ref: "Matthew 6:6", apiRef: "Matthew+6:6" },
  "Worship": { ref: "Psalm 100:4", apiRef: "Psalm+100:4" },
  "Family": { ref: "Proverbs 22:6", apiRef: "Proverbs+22:6" },
  "Work": { ref: "Colossians 3:23", apiRef: "Colossians+3:23" },
  "Prophecy": { ref: "1 Thessalonians 5:20-21", apiRef: "1+Thessalonians+5:20-21" },
  "Scripture": { ref: "2 Timothy 3:16-17", apiRef: "2+Timothy+3:16-17" },
  "Sexuality": { ref: "1 Corinthians 6:19-20", apiRef: "1+Corinthians+6:19-20" },
};

type AnalysisResult = {
  content: string;
  attack_rating: number;
  analysis: string;
  tags: string[];
  saved?: boolean;
};

type FeedPost = {
  id: string;
  user_id: string;
  body: string;
  tags: string[];
  attack_rating: number;
  ai_analysis: string;
  created_at: string;
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState("");
  const [verseText, setVerseText] = useState<Record<string, string>>({});
  const [loadingVerse, setLoadingVerse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const { count, limit, increment } = useDailyLimit("thinkers");

  // Feed state
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState("All");
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Load feed
  useEffect(() => {
    async function loadFeed() {
      setFeedLoading(true);
      let query = supabase
        .from("thinker_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (feedFilter !== "All") {
        query = query.contains("tags", [feedFilter]);
      }

      const { data } = await query;
      setFeedPosts((data as FeedPost[]) ?? []);
      setFeedLoading(false);
    }
    loadFeed();
  }, [feedFilter]);

  const toggleTag = (tag: string) => {
    setTagError("");
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else if (selectedTags.length >= 3) {
      setTagError("You can select up to 3 topics.");
    } else {
      setSelectedTags((prev) => [...prev, tag]);
      // Fetch verse if not cached
      const mapping = TAG_SCRIPTURE_MAP[tag];
      if (mapping && !verseText[tag]) {
        setLoadingVerse(tag);
        fetch(`https://bible-api.com/${mapping.apiRef}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.text) setVerseText((prev) => ({ ...prev, [tag]: d.text.trim() }));
          })
          .catch(() => {})
          .finally(() => setLoadingVerse(null));
      }
    }
  };

  const appendVerseToContent = (tag: string) => {
    const mapping = TAG_SCRIPTURE_MAP[tag];
    const text = verseText[tag];
    if (!mapping || !text) return;
    const citation = `\n\n"${text}" — ${mapping.ref}`;
    setContent((prev) => prev + citation);
  };

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
      const newResult: AnalysisResult = { content: content.trim(), tags: [...selectedTags], ...result };

      // Save to thinker_posts feed
      await supabase.from("thinker_posts").insert({
        user_id: userId,
        body: content.trim(),
        tags: selectedTags,
        attack_rating: result.attack_rating,
        ai_analysis: result.analysis,
      });

      setResults((prev) => [newResult, ...prev]);
      setContent("");
      setSelectedTags([]);

      // Refresh feed
      const { data } = await supabase
        .from("thinker_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setFeedPosts(data as FeedPost[]);
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

  // Active scripture suggestions for selected tags
  const activeSuggestions = selectedTags
    .filter((tag) => TAG_SCRIPTURE_MAP[tag])
    .map((tag) => ({ tag, ...TAG_SCRIPTURE_MAP[tag]!, text: verseText[tag] }));

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-3xl px-4 py-4">
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Thinkers</h2>
        <p className="text-sm text-muted-foreground">Share your struggle. Know your battlefield.</p>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
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

            {/* Tag selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Select up to 3 topics</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: isSelected ? "#92400E" : "transparent",
                        color: isSelected ? "#FFF" : "#92400E",
                        border: "1px solid #92400E",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {tagError && (
                <p className="mt-1.5 text-xs" style={{ color: "#92400E" }}>{tagError}</p>
              )}
            </div>

            {/* Scripture suggestions */}
            {activeSuggestions.length > 0 && (
              <div className="space-y-2">
                {activeSuggestions.map((s) => (
                  <div
                    key={s.tag}
                    className="rounded-lg border p-3"
                    style={{ backgroundColor: "#FEFBF4", borderColor: "#E7D5B3" }}
                  >
                    <p className="text-xs font-medium" style={{ color: "#92400E" }}>
                      📖 Suggested for "{s.tag}" — {s.ref}
                    </p>
                    {loadingVerse === s.tag ? (
                      <p className="mt-1 text-xs text-muted-foreground italic">Loading verse…</p>
                    ) : s.text ? (
                      <>
                        <p className="mt-1 text-xs text-foreground leading-relaxed italic">"{s.text}"</p>
                        <button
                          type="button"
                          onClick={() => appendVerseToContent(s.tag)}
                          className="mt-2 rounded px-2.5 py-1 text-[10px] font-medium transition-colors"
                          style={{ backgroundColor: "#E7D5B3", color: "#92400E" }}
                        >
                          Add to post
                        </button>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground italic">Verse unavailable</p>
                    )}
                  </div>
                ))}
              </div>
            )}

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

        {/* Your results (session) */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Your Analysis</h3>
            {results.map((r, i) => {
              const color = getRatingColor(r.attack_rating);
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm text-foreground leading-relaxed">{r.content}</p>
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "#E7D5B3", color: "#92400E" }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${color.text}`}>{r.attack_rating}/10</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${color.bg} ${color.text}`}>{color.label}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full transition-all duration-500 ${color.bar}`} style={{ width: `${r.attack_rating * 10}%` }} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{r.analysis}</p>
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
        )}

        {/* Community Feed */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: "'Georgia', serif" }}>Community Feed</h3>
          {/* Feed filter pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {["All", ...PRESET_TAGS].map((tag) => {
              const isActive = feedFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFeedFilter(tag)}
                  className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors"
                  style={{
                    backgroundColor: isActive ? "#92400E" : "transparent",
                    color: isActive ? "#FFF" : "#92400E",
                    border: "1px solid #92400E",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {feedLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : feedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet. Be the first to share.</p>
          ) : (
            <div className="space-y-3">
              {feedPosts.map((post) => {
                const color = getRatingColor(post.attack_rating);
                return (
                  <div key={post.id} className="rounded-xl border border-border bg-card p-5">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.body}</p>
                    {post.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {post.tags.map((t) => (
                          <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "#E7D5B3", color: "#92400E" }}>{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`text-sm font-bold ${color.text}`}>{post.attack_rating}/10</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color.bg} ${color.text}`}>{color.label}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{post.ai_analysis}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}