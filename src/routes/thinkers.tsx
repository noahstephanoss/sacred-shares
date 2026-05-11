import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type FormEvent, useRef } from "react";
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
  title: string | null;
  post_type: string;
  tags: string[];
  attack_rating: number;
  ai_analysis: string;
  created_at: string;
};

type VoteRecord = {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: "up" | "down";
};

type ThinkerResponse = {
  id: string;
  post_id: string;
  user_id: string;
  type: "affirm" | "challenge";
  body: string;
  scripture_reference: string | null;
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
  const [postTitle, setPostTitle] = useState("");
  const [writeMode, setWriteMode] = useState<"journal" | "draft" | "post">("post");

  // Romans 2:1 daily warning
  const [showWarning, setShowWarning] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("thinkers_warning_date");
    const today = new Date().toISOString().slice(0, 10);
    return stored !== today;
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState("");
  const [verseText, setVerseText] = useState<Record<string, string>>({});
  const [loadingVerse, setLoadingVerse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const { count, limit, increment } = useDailyLimit("thinkers");
  const [formFading, setFormFading] = useState(false);
  const [newPostId, setNewPostId] = useState<string | null>(null);

  // Feed state
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState("All");
  const [feedLoading, setFeedLoading] = useState(true);

  // Responses state
  const [responses, setResponses] = useState<Record<string, ThinkerResponse[]>>({});
  const [respondingTo, setRespondingTo] = useState<{ postId: string; type: "affirm" | "challenge" } | null>(null);
  const [responseBody, setResponseBody] = useState("");
  const [responseScripture, setResponseScripture] = useState("");
  const [responseSubmitting, setResponseSubmitting] = useState(false);

  // Votes state
  const [votes, setVotes] = useState<Record<string, VoteRecord[]>>({});
  const [myVotes, setMyVotes] = useState<Record<string, "up" | "down">>({});
  const [feedSort, setFeedSort] = useState<"top" | "new">("top");

  const isScriptureMode = selectedTags.includes("Scripture");

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
        .eq("post_type", "post")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (feedFilter !== "All") {
        query = query.contains("tags", [feedFilter]);
      }

      const { data } = await query;
      setFeedPosts((data as FeedPost[]) ?? []);
      setFeedLoading(false);

      // Load responses for feed posts
      if (data && data.length > 0) {
        const postIds = (data as FeedPost[]).map((p) => p.id);
        const { data: resData } = await supabase
          .from("thinker_responses")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });
        if (resData) {
          const grouped: Record<string, ThinkerResponse[]> = {};
          for (const r of resData as ThinkerResponse[]) {
            if (!grouped[r.post_id]) grouped[r.post_id] = [];
            grouped[r.post_id].push(r);
          }
          setResponses(grouped);
        }

        // Load votes (upvotes visible to all, own votes visible)
        const { data: voteData } = await supabase
          .from("thinker_votes")
          .select("*")
          .in("post_id", postIds);
        if (voteData) {
          const grouped: Record<string, VoteRecord[]> = {};
          const mine: Record<string, "up" | "down"> = {};
          for (const v of voteData as VoteRecord[]) {
            if (!grouped[v.post_id]) grouped[v.post_id] = [];
            grouped[v.post_id].push(v);
            if (v.user_id === userId) mine[v.post_id] = v.vote_type;
          }
          setVotes(grouped);
          setMyVotes(mine);
        }
      }
    }
    loadFeed();
  }, [feedFilter, userId]);

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
    if (writeMode === "journal" && !postTitle.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Journal mode: skip AI analysis and daily limit
      if (writeMode === "journal") {
        setFormFading(true);
        await new Promise((resolve) => setTimeout(resolve, 400));
        await supabase.from("thinker_posts").insert({
          user_id: userId,
          body: content.trim(),
          title: postTitle.trim(),
          tags: [],
          attack_rating: 0,
          ai_analysis: "",
          post_type: "journal",
          is_public: false,
        });
        setContent("");
        setPostTitle("");
        setFormFading(false);
        setLoading(false);
        return;
      }

      // Scripture mode: skip AI analysis and daily limit, post directly
      if (isScriptureMode) {
        setFormFading(true);
        await new Promise((resolve) => setTimeout(resolve, 400));
        const { data: insertedPost } = await supabase.from("thinker_posts").insert({
          user_id: userId,
          body: content.trim(),
          tags: selectedTags,
          attack_rating: 0,
          ai_analysis: "",
          post_type: writeMode,
          is_public: writeMode === "post",
        }).select("id").single();

        setContent("");
        setSelectedTags([]);
        setFormFading(false);

        if (writeMode === "post") {
          const { data } = await supabase
            .from("thinker_posts")
            .select("*")
            .eq("post_type", "post")
            .eq("is_public", true)
            .order("created_at", { ascending: false })
            .limit(50);
          if (data) {
            setFeedPosts(data as FeedPost[]);
            if (insertedPost) {
              setNewPostId(insertedPost.id);
              setTimeout(() => setNewPostId(null), 600);
            }
          }
        }
        setLoading(false);
        return;
      }

      const allowed = await increment();
      if (!allowed) {
        setError("You've reached your daily limit of 50 analyses. Come back tomorrow.");
        setLoading(false);
        return;
      }

      const result = await analyzeThinkerPost(content.trim());
      const newResult: AnalysisResult = { content: content.trim(), tags: [...selectedTags], ...result };

      // Fade out form
      setFormFading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Save to thinker_posts feed
      const { data: insertedPost } = await supabase.from("thinker_posts").insert({
        user_id: userId,
        body: content.trim(),
        tags: selectedTags,
        attack_rating: result.attack_rating,
        ai_analysis: result.analysis,
        post_type: writeMode,
        is_public: writeMode === "post",
      }).select("id").single();

      setResults((prev) => [newResult, ...prev]);
      setContent("");
      setSelectedTags([]);
      setFormFading(false);

      // Only refresh feed if posting publicly
      if (writeMode === "post") {
        const { data } = await supabase
          .from("thinker_posts")
          .select("*")
          .eq("post_type", "post")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(50);
        if (data) {
          setFeedPosts(data as FeedPost[]);
          if (insertedPost) {
            setNewPostId(insertedPost.id);
            setTimeout(() => setNewPostId(null), 600);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setFormFading(false);
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

  const handleSubmitResponse = useCallback(async () => {
    if (!userId || !respondingTo || !responseBody.trim()) return;
    if (respondingTo.type === "challenge" && !responseScripture.trim()) return;

    setResponseSubmitting(true);
    const { data, error } = await supabase.from("thinker_responses").insert({
      post_id: respondingTo.postId,
      user_id: userId,
      type: respondingTo.type,
      body: responseBody.trim(),
      scripture_reference: responseScripture.trim() || null,
    }).select().single();

    if (!error && data) {
      const newResp = data as ThinkerResponse;
      setResponses((prev) => ({
        ...prev,
        [respondingTo.postId]: [...(prev[respondingTo.postId] ?? []), newResp],
      }));
      setRespondingTo(null);
      setResponseBody("");
      setResponseScripture("");
    }
    setResponseSubmitting(false);
  }, [userId, respondingTo, responseBody, responseScripture]);

  const handleVote = useCallback(async (postId: string, voteType: "up" | "down") => {
    if (!userId) { openAuthPrompt(); return; }

    const currentVote = myVotes[postId];

    if (currentVote === voteType) {
      // Remove vote
      await supabase.from("thinker_votes").delete().eq("post_id", postId).eq("user_id", userId);
      setMyVotes((prev) => { const next = { ...prev }; delete next[postId]; return next; });
      setVotes((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((v) => v.user_id !== userId),
      }));
    } else if (currentVote) {
      // Switch vote
      await supabase.from("thinker_votes").update({ vote_type: voteType }).eq("post_id", postId).eq("user_id", userId);
      setMyVotes((prev) => ({ ...prev, [postId]: voteType }));
      setVotes((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map((v) => v.user_id === userId ? { ...v, vote_type: voteType } : v),
      }));
    } else {
      // New vote
      const { data } = await supabase.from("thinker_votes").insert({
        post_id: postId,
        user_id: userId,
        vote_type: voteType,
      }).select().single();
      if (data) {
        setMyVotes((prev) => ({ ...prev, [postId]: voteType }));
        setVotes((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] ?? []), data as VoteRecord],
        }));
      }
    }
  }, [userId, myVotes, openAuthPrompt]);

  // Score calculation
  const calcTimeDecayScore = useCallback((post: FeedPost) => {
    const postVotes = votes[post.id] ?? [];
    const upvotes = postVotes.filter((v) => v.vote_type === "up").length;
    const downvotes = postVotes.filter((v) => v.vote_type === "down").length;
    const postResps = responses[post.id] ?? [];
    const affirmCount = postResps.filter((r) => r.type === "affirm").length;
    const challengeCount = postResps.filter((r) => r.type === "challenge").length;

    const rawScore = Math.max(0, (upvotes * 2) + (affirmCount * 1.5) + (challengeCount * 3) - (downvotes * 1));
    const hoursSincePosted = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    return rawScore / Math.pow(hoursSincePosted + 2, 1.5);
  }, [votes, responses]);

  // Sorted feed
  const sortedFeed = [...feedPosts].sort((a, b) => {
    if (feedSort === "new") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return calcTimeDecayScore(b) - calcTimeDecayScore(a);
  });

  // Active scripture suggestions for selected tags
  const activeSuggestions = selectedTags
    .filter((tag) => TAG_SCRIPTURE_MAP[tag])
    .map((tag) => ({ tag, ...TAG_SCRIPTURE_MAP[tag]!, text: verseText[tag] }));

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      {/* Romans 2:1 Daily Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" style={{ backdropFilter: "blur(4px)" }}>
          <div
            className="mx-4 max-w-md rounded-xl border p-8 text-center"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            {/* Gold Cross */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="mx-auto mb-6 h-12 w-12" fill="none">
              <rect x="16" y="4" width="8" height="32" rx="1.5" fill="#B8860B" />
              <rect x="4" y="14" width="32" height="8" rx="1.5" fill="#B8860B" />
            </svg>
            <p
              className="text-base text-foreground leading-relaxed italic"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              "You, therefore, have no excuse, you who pass judgment on someone else, for at whatever point you judge another, you are condemning yourself."
            </p>
            <p className="mt-2 text-xs text-muted-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              — Romans 2:1
            </p>
            <button
              onClick={() => {
                localStorage.setItem("thinkers_warning_date", new Date().toISOString().slice(0, 10));
                setShowWarning(false);
              }}
              className="mt-8 rounded-full px-8 py-3 text-sm font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: "#B8860B", color: "#FDF8F0" }}
            >
              Enter with humility
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-4">
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Thinkers</h2>
        <p className="text-sm text-muted-foreground">Share your struggle. Know your battlefield.</p>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Post form */}
        <div
          className="rounded-xl border border-border bg-card p-6"
          style={{
            transition: "opacity 400ms ease-out, transform 400ms ease-out",
            opacity: formFading ? 0 : 1,
            transform: formFading ? "scale(0.97)" : "scale(1)",
          }}
        >
          {/* Daily usage progress bar */}
          {!isScriptureMode && (<div className="mb-4">
            <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-in-out"
                style={{ backgroundColor: "var(--primary)", width: `${Math.max(0, ((limit - count) / limit) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground tracking-wide">Daily reflection limit</p>
          </div>)}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Writing mode selector */}
            <div className="flex gap-2">
              {([
                { mode: "journal" as const, icon: "📓", label: "Journal" },
                { mode: "draft" as const, icon: "📝", label: "Draft" },
                { mode: "post" as const, icon: "📢", label: "Post" },
              ]).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setWriteMode(mode); setSelectedTags([]); setPostTitle(""); }}
                  className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: writeMode === mode ? "var(--primary)" : "transparent",
                    color: writeMode === mode ? "#FFF" : "var(--primary)",
                    border: "1px solid var(--primary)",
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Title field for journal mode */}
            {writeMode === "journal" && (
              <input
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Journal entry title"
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            )}

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={writeMode === "journal" ? "Write your private reflections…" : "What thought or struggle is weighing on you?"}
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />

            {/* Tag selector — hidden in journal mode */}
            {writeMode !== "journal" && (<div>
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
                        backgroundColor: isSelected ? "var(--primary)" : "transparent",
                        color: isSelected ? "#FFF" : "var(--primary)",
                        border: "1px solid var(--primary)",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {tagError && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--primary)" }}>{tagError}</p>
              )}
            </div>)}

            {/* Scripture suggestions */}
            {writeMode !== "journal" && activeSuggestions.length > 0 && (
              <div className="space-y-2">
                {activeSuggestions.map((s) => (
                  <div
                    key={s.tag}
                    className="rounded-lg border p-3"
                    style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <p className="text-xs font-medium" style={{ color: "var(--primary)" }}>
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
                          style={{ backgroundColor: "var(--border)", color: "var(--primary)" }}
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
              disabled={loading || !content.trim() || (writeMode === "journal" && !postTitle.trim())}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading
                ? (writeMode === "journal" || isScriptureMode ? "Saving…" : "Analyzing...")
                : writeMode === "journal"
                  ? "Save Journal Entry"
                  : isScriptureMode
                    ? (writeMode === "draft" ? "Save Draft" : "Share Scripture")
                    : writeMode === "draft" ? "Save Draft & Analyze" : "Analyze Spiritual Attack"}
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
                        <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--border)", color: "var(--primary)" }}>{t}</span>
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
                      style={{ backgroundColor: r.saved ? "var(--border)" : "transparent", color: "var(--primary)", border: "1px solid var(--primary)" }}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Community Feed</h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFeedSort("top")}
                className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: feedSort === "top" ? "var(--primary)" : "transparent",
                  color: feedSort === "top" ? "#FFF" : "var(--primary)",
                  border: "1px solid var(--primary)",
                }}
              >
                🔥 Top
              </button>
              <button
                type="button"
                onClick={() => setFeedSort("new")}
                className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: feedSort === "new" ? "var(--primary)" : "transparent",
                  color: feedSort === "new" ? "#FFF" : "var(--primary)",
                  border: "1px solid var(--primary)",
                }}
              >
                🕊️ New
              </button>
            </div>
          </div>
          {/* Tag filter pills */}
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
                    backgroundColor: isActive ? "var(--primary)" : "transparent",
                    color: isActive ? "#FFF" : "var(--primary)",
                    border: "1px solid var(--primary)",
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
              {sortedFeed.map((post) => {
                const color = getRatingColor(post.attack_rating);
                const isScripturePost = post.tags.includes("Scripture");
                const postUpvotes = (votes[post.id] ?? []).filter((v) => v.vote_type === "up").length;
                const myVote = myVotes[post.id];
                return (
                  <div
                    key={post.id}
                    className="rounded-xl border border-border bg-card p-5"
                    data-new-post={newPostId === post.id ? post.id : undefined}
                    style={newPostId === post.id ? { animation: "thinker-enter 500ms ease-in forwards" } : undefined}
                  >
                    {newPostId === post.id && (
                      <style>{`@keyframes thinker-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                    )}
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.body}</p>
                    {post.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {post.tags.map((t) => (
                          <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--border)", color: "var(--primary)" }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {!isScripturePost && (
                      <>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`text-sm font-bold ${color.text}`}>{post.attack_rating}/10</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color.bg} ${color.text}`}>{color.label}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{post.ai_analysis}</p>
                      </>
                    )}
                    <p className="mt-2 text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>

                    {/* Voting */}
                    <div className="mt-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleVote(post.id, "up")}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: myVote === "up" ? "var(--primary)" : "transparent",
                          color: myVote === "up" ? "#FFF" : "var(--primary)",
                          border: "1px solid var(--primary)",
                        }}
                      >
                        ▲ {postUpvotes > 0 ? postUpvotes : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVote(post.id, "down")}
                        className="inline-flex items-center rounded px-2 py-1 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: myVote === "down" ? "#78716C" : "transparent",
                          color: myVote === "down" ? "#FFF" : "#78716C",
                          border: "1px solid #A8A29E",
                        }}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Affirm / Challenge */}
                    {(() => {
                      const postResps = responses[post.id] ?? [];
                      const affirmCount = postResps.filter((r) => r.type === "affirm").length;
                      const challengeCount = postResps.filter((r) => r.type === "challenge").length;
                      return (
                        <>
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (!userId) { openAuthPrompt(); return; }
                                setRespondingTo({ postId: post.id, type: "affirm" });
                                setResponseBody(""); setResponseScripture("");
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                              style={{ border: "1px solid var(--primary)", color: "var(--primary)" }}
                            >
                              💬 Affirm
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!userId) { openAuthPrompt(); return; }
                                setRespondingTo({ postId: post.id, type: "challenge" });
                                setResponseBody(""); setResponseScripture("");
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                              style={{ border: "1px solid #7C2D12", color: "#7C2D12" }}
                            >
                              ⚔️ Challenge
                            </button>
                            {(affirmCount > 0 || challengeCount > 0) && (
                              <span className="text-[10px] text-muted-foreground">
                                {affirmCount} Affirm{affirmCount !== 1 ? "s" : ""} · {challengeCount} Challenge{challengeCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Inline response form */}
                          {respondingTo?.postId === post.id && (
                            <div className="mt-3 rounded-lg border p-3 space-y-2" style={{ borderColor: respondingTo.type === "affirm" ? "var(--border)" : "#7C2D12", backgroundColor: "var(--card)" }}>
                              <p className="text-xs font-medium" style={{ color: respondingTo.type === "affirm" ? "var(--primary)" : "#7C2D12" }}>
                                {respondingTo.type === "affirm" ? "💬 Affirm this thought" : "⚔️ Challenge with truth"}
                              </p>
                              <textarea
                                value={responseBody}
                                onChange={(e) => setResponseBody(e.target.value)}
                                placeholder={respondingTo.type === "affirm" ? "Share encouragement…" : "Speak truth in love…"}
                                rows={2}
                                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                              {respondingTo.type === "challenge" && (
                                <input
                                  value={responseScripture}
                                  onChange={(e) => setResponseScripture(e.target.value)}
                                  placeholder="Scripture reference (required)"
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                              )}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleSubmitResponse}
                                  disabled={responseSubmitting || !responseBody.trim() || (respondingTo.type === "challenge" && !responseScripture.trim())}
                                  className="rounded px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                                  style={{ backgroundColor: respondingTo.type === "affirm" ? "var(--primary)" : "#7C2D12" }}
                                >
                                  {responseSubmitting ? "Sending…" : "Submit"}
                                </button>
                                <button type="button" onClick={() => setRespondingTo(null)} className="rounded px-3 py-1.5 text-xs text-muted-foreground">Cancel</button>
                              </div>
                            </div>
                          )}

                          {/* Existing responses */}
                          {postResps.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {postResps.map((resp) => (
                                <div
                                  key={resp.id}
                                  className="rounded-md p-3 text-xs"
                                  style={{
                                    borderLeft: `3px solid ${resp.type === "affirm" ? "#D97706" : "#7C2D12"}`,
                                    backgroundColor: "var(--card)",
                                  }}
                                >
                                  <span className="font-medium" style={{ color: resp.type === "affirm" ? "var(--primary)" : "#7C2D12" }}>
                                    {resp.type === "affirm" ? "Affirm" : "⚔️ Challenge"}
                                  </span>
                                  <p className="mt-1 text-foreground leading-relaxed">{resp.body}</p>
                                  {resp.scripture_reference && (
                                    <p className="mt-1 italic text-muted-foreground">— {resp.scripture_reference}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
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