import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Testimonies" },
      { name: "description", content: "Read and share spiritual testimonies from the community." },
    ],
  }),
  component: FeedPage,
});

const MAX_CHARS = 280;

type Testimony = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_public: boolean;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PrivateBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      Private
    </span>
  );
}

function ReactionButtons({ onAuthRequired }: { onAuthRequired?: () => void }) {
  const [praying, setPraying] = useState(0);
  const [amen, setAmen] = useState(0);
  const [prayedClicked, setPrayedClicked] = useState(false);
  const [amenClicked, setAmenClicked] = useState(false);

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
      <button
        onClick={() => { if (onAuthRequired) { onAuthRequired(); return; } if (!prayedClicked) { setPraying((p) => p + 1); setPrayedClicked(true); } }}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          prayedClicked
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        🙏 Praying{praying > 0 && <span>{praying}</span>}
      </button>
      <button
        onClick={() => { if (onAuthRequired) { onAuthRequired(); return; } if (!amenClicked) { setAmen((a) => a + 1); setAmenClicked(true); } }}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          amenClicked
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        ✝️ Amen{amen > 0 && <span>{amen}</span>}
      </button>
    </div>
  );
}

function TestimonyCard({ testimony, onAuthRequired }: { testimony: Testimony; onAuthRequired?: () => void }) {
  return (
    <div className="rounded-xl bg-card px-5 py-4" style={{ boxShadow: "0 1px 6px rgba(107,63,42,0.08)" }}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {testimony.profiles?.display_name || "Anonymous"}
        </span>
        <span>·</span>
        <span>{timeAgo(testimony.created_at)}</span>
        {!testimony.is_public && <PrivateBadge />}
      </div>
      <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {testimony.body}
      </p>
      <ReactionButtons onAuthRequired={onAuthRequired} />
    </div>
  );
}

function FeedPage() {
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [myPosts, setMyPosts] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"public" | "mine">("public");

  const remaining = MAX_CHARS - body.length;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadTestimonies = async () => {
    setLoading(true);

    const { data: publicData } = await supabase
      .from("testimonies")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    const filtered = ((publicData ?? []) as unknown as Testimony[]).filter((t) => t.is_public === true);
    setTestimonies(filtered);

    if (userId) {
      const { data: myData } = await supabase
        .from("testimonies")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setMyPosts((myData ?? []) as unknown as Testimony[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTestimonies();
  }, [userId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || body.length > MAX_CHARS || submitting || !userId) return;
    setSubmitting(true);

    const { error } = await supabase.from("testimonies").insert({
      user_id: userId,
      title: "",
      body: body.trim(),
      is_public: isPublic,
    });

    if (!error) {
      setBody("");
      setIsPublic(true);
      setShowForm(false);
      await loadTestimonies();
    }
    setSubmitting(false);
  };

  const displayPosts = tab === "public" ? testimonies : myPosts;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              Testimonies Feed
            </h2>
            <p className="text-sm text-muted-foreground">Share what God is doing in your life</p>
          </div>
          {userId && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {showForm ? "Cancel" : "+ Share"}
            </button>
          )}
          {!userId && (
            <button
              onClick={openAuthPrompt}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              + Share
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-12">
        {/* Post form */}
        {showForm && userId && (
          <div className="mb-6 rounded-xl bg-card px-5 py-4" style={{ boxShadow: "0 1px 6px rgba(107,63,42,0.08)" }}>
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={body}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) setBody(e.target.value);
                }}
                placeholder="What is God doing in your life today?"
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={!isPublic}
                      onChange={(e) => setIsPublic(!e.target.checked)}
                      className="rounded border-input"
                    />
                    Private
                  </label>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      remaining <= 0
                        ? "text-destructive"
                        : remaining <= 50
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {remaining}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !body.trim() || remaining < 0}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        {userId && (
          <div className="mb-5 flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setTab("public")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "public" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Public Feed
            </button>
            <button
              onClick={() => setTab("mine")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "mine" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My Posts
            </button>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading testimonies...</p>
        ) : displayPosts.length === 0 ? (
          tab === "mine" ? (
            <EmptyState
              verse="Your story is worth telling"
              reference="Romans 10:11"
              description="Share your first testimony with the community."
            />
          ) : (
            <EmptyState
              verse="Be still and know that I am God"
              reference="Psalm 46:10"
              description="Be the first to share what God is doing in your life."
            />
          )
        ) : (
          <div className="space-y-3">
            {displayPosts.map((t) => (
              <TestimonyCard key={t.id} testimony={t} onAuthRequired={userId ? undefined : openAuthPrompt} />
            ))}
          </div>
        )}
      </main>
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}