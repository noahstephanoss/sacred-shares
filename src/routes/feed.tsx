import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Testimonies" },
      { name: "description", content: "Read and share spiritual testimonies from the community." },
    ],
  }),
  component: FeedPage,
});

type Testimony = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_public: boolean;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

function PrivateBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      Private
    </span>
  );
}

function TestimonyCard({ testimony, isOwn }: { testimony: Testimony; isOwn: boolean }) {
  const date = new Date(testimony.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              {testimony.title}
            </h3>
            {!testimony.is_public && <PrivateBadge />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {testimony.profiles?.display_name || "Anonymous"} · {date}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {testimony.body}
      </p>
    </div>
  );
}

function FeedPage() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [myPosts, setMyPosts] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"public" | "mine">("public");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadTestimonies = async () => {
    setLoading(true);

    // Load public feed
    const { data: publicData } = await supabase
      .from("testimonies")
      .select("*, profiles!testimonies_user_id_fkey(display_name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    // Double-filter: only show is_public = true regardless of DB response
    const filtered = (publicData ?? []).filter((t: Testimony) => t.is_public === true);
    setTestimonies(filtered);

    // Load user's own posts (including private)
    if (userId) {
      const { data: myData } = await supabase
        .from("testimonies")
        .select("*, profiles!testimonies_user_id_fkey(display_name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setMyPosts(myData ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTestimonies();
  }, [userId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting || !userId) return;
    setSubmitting(true);

    const { error } = await supabase.from("testimonies").insert({
      user_id: userId,
      title: title.trim(),
      body: body.trim(),
      is_public: isPublic,
    });

    if (!error) {
      setTitle("");
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
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              Testimony Feed
            </h1>
            <p className="text-sm text-muted-foreground">Stories of faith from the community</p>
          </div>
          <div className="flex items-center gap-3">
            {userId && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {showForm ? "Cancel" : "Share Testimony"}
              </button>
            )}
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Post form */}
        {showForm && userId && (
          <div className="mb-8 rounded-xl border border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title of your testimony"
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your testimony..."
                rows={5}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={!isPublic}
                    onChange={(e) => setIsPublic(!e.target.checked)}
                    className="rounded border-input"
                  />
                  Private (only visible to you)
                </label>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !body.trim()}
                  className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        {userId && (
          <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
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
          <p className="py-12 text-center text-sm text-muted-foreground">
            {tab === "mine" ? "You haven't shared any testimonies yet." : "No testimonies yet. Be the first to share."}
          </p>
        ) : (
          <div className="space-y-4">
            {displayPosts.map((t) => (
              <TestimonyCard key={t.id} testimony={t} isOwn={t.user_id === userId} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}