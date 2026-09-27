import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/home")({
  validateSearch: (s: Record<string, unknown>): { burden?: string; testimony?: string } => ({
    burden: typeof s.burden === "string" ? s.burden : undefined,
    testimony: typeof s.testimony === "string" ? s.testimony : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Home — Testimonies" },
      { name: "description", content: "Read and share spiritual testimonies from the community." },
      { property: "og:title", content: "Home — Testimonies" },
      { property: "og:description", content: "Read and share spiritual testimonies from the community." },
      { property: "og:url", content: "https://testimonies.chat/home" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

type ReactionType = "praying" | "amen" | "peace";

type Reactor = {
  user_id: string;
  display_name: string;
  reaction_type: ReactionType;
  reacted_at: string;
};

const REACTION_CONFIG: { type: ReactionType; icon: string; label: string }[] = [
  { type: "praying", icon: "🙏", label: "Praying" },
  { type: "amen", icon: "✝️", label: "Amen" },
  { type: "peace", icon: "🕊️", label: "Peace" },
];

function ReactionButtons({
  testimonyId,
  userId,
  onAuthRequired,
  disabled,
}: {
  testimonyId: string;
  userId: string | null;
  onAuthRequired?: () => void;
  disabled?: boolean;
}) {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({ praying: 0, amen: 0, peace: 0 });
  const [myReactions, setMyReactions] = useState<Set<ReactionType>>(new Set());
  const [busy, setBusy] = useState(false);
  const [popping, setPopping] = useState<ReactionType | null>(null);
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [showReactors, setShowReactors] = useState(false);
  const [reactionTab, setReactionTab] = useState<"all" | ReactionType>("all");

  const loadReactors = useCallback(async () => {
    const { data } = await supabase.rpc("get_testimony_reactors", { _testimony_id: testimonyId });
    const next = ((data ?? []) as unknown as Reactor[]).filter((reactor) =>
      REACTION_CONFIG.some(({ type }) => type === reactor.reaction_type),
    );
    setReactors(next);

    const nextCounts: Record<ReactionType, number> = { praying: 0, amen: 0, peace: 0 };
    next.forEach((reactor) => { nextCounts[reactor.reaction_type] += 1; });
    setCounts(nextCounts);
    setMyReactions(new Set(next.filter((reactor) => reactor.user_id === userId).map((reactor) => reactor.reaction_type)));
  }, [testimonyId, userId]);

  useEffect(() => {
    void loadReactors();
  }, [loadReactors]);

  const toggle = async (type: ReactionType) => {
    if (disabled) return;
    if (!userId) {
      onAuthRequired?.();
      return;
    }
    if (busy) return;
    const has = myReactions.has(type);
    const previousReactions = new Set(myReactions);
    const previousCounts = { ...counts };
    setBusy(true);
    setPopping(type);
    window.setTimeout(() => setPopping((current) => current === type ? null : current), 260);

    if (has) {
      setMyReactions((prev) => { const next = new Set(prev); next.delete(type); return next; });
      setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      const { error } = await supabase
        .from("testimony_reactions")
        .delete()
        .eq("testimony_id", testimonyId)
        .eq("user_id", userId)
        .eq("type", type);
      if (error) {
        setMyReactions(previousReactions);
        setCounts(previousCounts);
      } else {
        await loadReactors();
      }
    } else {
      setMyReactions((prev) => new Set(prev).add(type));
      setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
      const { error } = await supabase
        .from("testimony_reactions")
        .insert({ testimony_id: testimonyId, user_id: userId, type } as any);
      if (error) {
        setMyReactions(previousReactions);
        setCounts(previousCounts);
      } else {
        await loadReactors();
      }
    }
    setBusy(false);
  };

  const uniqueReactors = Array.from(
    reactors.reduce((people, reactor) => {
      const person = people.get(reactor.user_id);
      if (person) person.reactions.push(reactor.reaction_type);
      else people.set(reactor.user_id, { ...reactor, reactions: [reactor.reaction_type] });
      return people;
    }, new Map<string, Reactor & { reactions: ReactionType[] }>()),
  ).map(([, reactor]) => reactor);
  const sortedReactors = [...uniqueReactors].sort((a, b) => {
    if (a.user_id === userId) return -1;
    if (b.user_id === userId) return 1;
    return new Date(b.reacted_at).getTime() - new Date(a.reacted_at).getTime();
  });
  const otherRecent = sortedReactors.find((reactor) => reactor.user_id !== userId);
  const currentUserReacted = uniqueReactors.some((reactor) => reactor.user_id === userId);
  const reactorCount = uniqueReactors.length;
  const lead = currentUserReacted ? "You" : otherRecent?.display_name;
  const summary = lead
    ? reactorCount === 1 ? `${lead} reacted` : `${lead} and ${reactorCount - 1} others reacted`
    : "";
  const visibleReactors = reactionTab === "all"
    ? sortedReactors
    : sortedReactors.filter((reactor) => reactor.reactions.includes(reactionTab));
  const reactionIcon = (type: ReactionType) => REACTION_CONFIG.find((item) => item.type === type)?.icon;

  return (
    <>
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center gap-3">
          {REACTION_CONFIG.map((r) => {
            const active = myReactions.has(r.type);
            return (
              <button
                key={r.type}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!disabled) void toggle(r.type);
                }}
                disabled={disabled}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                } ${disabled ? "cursor-default" : ""} ${popping === r.type ? "animate-reaction-pop" : ""}`}
              >
                {r.icon} {r.label}
                {counts[r.type] > 0 && <span>{counts[r.type]}</span>}
              </button>
            );
          })}
        </div>
        {summary && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setShowReactors(true); }}
            className="mt-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {summary}
          </button>
        )}
      </div>

      {showReactors && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 px-4 pb-4 sm:items-center sm:pb-0"
          onClick={(event) => { event.stopPropagation(); setShowReactors(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reactors-${testimonyId}`}
            className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 id={`reactors-${testimonyId}`} className="font-semibold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
                Reactions
              </h2>
              <button type="button" aria-label="Close reactions" onClick={() => setShowReactors(false)} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">×</button>
            </div>
            <div className="flex border-b border-border px-2" role="tablist" aria-label="Filter reactions">
              {(["all", ...REACTION_CONFIG.map(({ type }) => type)] as const).map((value) => {
                const label = value === "all" ? "All" : reactionIcon(value);
                const count = value === "all" ? reactorCount : counts[value];
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={reactionTab === value}
                    onClick={() => setReactionTab(value)}
                    className={`flex-1 border-b-2 px-2 py-3 text-xs font-medium transition-colors ${reactionTab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    {label} {count}
                  </button>
                );
              })}
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-4 py-2">
              {visibleReactors.map((reactor) => (
                <div key={reactor.user_id} className="flex items-center justify-between border-b border-border/60 py-3 last:border-b-0">
                  <span className="text-sm font-medium text-foreground">{reactor.user_id === userId ? "You" : reactor.display_name}</span>
                  <span className="flex gap-1.5 text-sm" aria-label={reactor.reactions.join(", ")}>
                    {reactor.reactions.map((type) => <span key={type}>{reactionIcon(type)}</span>)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function TestimonyCard({
  testimony,
  userId,
  onAuthRequired,
  onClick,
  onEdit,
  onDelete,
}: {
  testimony: Testimony;
  userId: string | null;
  onAuthRequired?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = userId === testimony.user_id;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [menuOpen]);

  return (
    <div
      className="relative cursor-pointer rounded-lg border border-border/70 bg-card px-6 py-5 shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-md active:-translate-y-0.5 active:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
      onClick={onClick}
    >
      {isOwn && (
        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Post options"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="rounded-md px-2 py-1 text-base leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 min-w-[120px] overflow-hidden rounded-md border border-border bg-card shadow-lg">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onEdit?.(); }}
                className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-muted"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onDelete?.(); }}
                className="block w-full px-3 py-2 text-left text-xs text-destructive hover:bg-muted"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {testimony.profiles?.display_name || "Anonymous"}
        </span>
        <span>·</span>
        <span>{timeAgo(testimony.created_at)}</span>
        {!testimony.is_public && <PrivateBadge />}
      </div>
      <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-8">
        {testimony.body}
      </p>
      <ReactionButtons testimonyId={testimony.id} userId={userId} onAuthRequired={onAuthRequired} />
    </div>
  );
}

function ReadingOverlay({
  testimony,
  userId,
  onAuthRequired,
  onClose,
}: {
  testimony: Testimony;
  userId: string | null;
  onAuthRequired?: () => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [navVisible, setNavVisible] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Check if scrolled to bottom (within 40px)
    if (!reachedBottom && el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setReachedBottom(true);
    }
    // Show nav when scrolled near top
    setNavVisible(el.scrollTop < 60);
  }, [reachedBottom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setNavVisible(e.clientY < 80);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // If testimony is short, auto-enable reactions
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 40) {
      setReachedBottom(true);
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onMouseMove={handleMouseMove}
    >
      {/* Nav bar overlay */}
      <header
        className="border-b border-border bg-background px-4 py-3 transition-opacity duration-300 ease-in-out"
        style={{ opacity: navVisible ? 1 : 0.15 }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Back to Home
          </button>
        </div>
      </header>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-2xl px-6 py-10">
          {/* Author & time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <span className="font-medium text-foreground">
              {testimony.profiles?.display_name || "Anonymous"}
            </span>
            <span>·</span>
            <span>{timeAgo(testimony.created_at)}</span>
            {!testimony.is_public && <PrivateBadge />}
          </div>

          {/* Testimony body — larger text */}
          <p
            className="text-foreground whitespace-pre-wrap"
            style={{ fontSize: "1.125rem", lineHeight: 1.9, fontFamily: "'Georgia', serif" }}
          >
            {testimony.body}
          </p>

          {/* Spacer */}
          <div className="mt-12 border-t border-border pt-6">
            {/* "Reflect before you react" */}
            <p
              className="text-center text-sm mb-4 transition-opacity duration-500 ease-in-out"
              style={{
                fontFamily: "'Georgia', serif",
                fontStyle: "italic",
                color: "#B8860B",
                opacity: reachedBottom ? 0.8 : 0,
              }}
            >
              Reflect before you react
            </p>

            {/* Reactions with opacity transition */}
            <div
              className="transition-opacity duration-500 ease-in-out"
              style={{ opacity: reachedBottom ? 1 : 0.2 }}
            >
              <ReactionButtons
                testimonyId={testimony.id}
                userId={userId}
                onAuthRequired={onAuthRequired}
                disabled={!reachedBottom}
              />
            </div>
          </div>
        </div>
      </div>
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
  const [readingTestimony, setReadingTestimony] = useState<Testimony | null>(null);
  const [editingTestimony, setEditingTestimony] = useState<Testimony | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newPostIds, setNewPostIds] = useState<string[]>([]);
  const search = Route.useSearch();
  const navigate = useNavigate();
  const burdenId = search.burden ?? null;

  const handleEditSave = async () => {
    if (!editingTestimony || !editBody.trim() || savingEdit) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("testimonies")
      .update({ body: editBody.trim() })
      .eq("id", editingTestimony.id);
    if (!error) {
      const id = editingTestimony.id;
      const newBody = editBody.trim();
      setTestimonies((prev) => prev.map((t) => (t.id === id ? { ...t, body: newBody } : t)));
      setMyPosts((prev) => prev.map((t) => (t.id === id ? { ...t, body: newBody } : t)));
      setEditingTestimony(null);
      setEditBody("");
    }
    setSavingEdit(false);
  };

  const handleDeleteTestimony = async (id: string) => {
    const { error } = await supabase.from("testimonies").delete().eq("id", id);
    if (!error) {
      setTestimonies((prev) => prev.filter((t) => t.id !== id));
      setMyPosts((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirmId(null);
    }
  };

  const remaining = MAX_CHARS - body.length;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadTestimonies = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    void loadTestimonies();
  }, [loadTestimonies]);

  useEffect(() => {
    const channel = supabase
      .channel("home-public-testimonies")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "testimonies", filter: "is_public=eq.true" },
        (payload) => {
          const post = payload.new as Pick<Testimony, "id" | "user_id" | "is_public">;
          if (!post.is_public || post.user_id === userId) return;
          setNewPostIds((current) => current.includes(post.id) ? current : [...current, post.id]);
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  const revealNewPosts = async () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadTestimonies();
    setNewPostIds([]);
  };

  useEffect(() => {
    if (burdenId && userId) setShowForm(true);
  }, [burdenId, userId]);

  useEffect(() => {
    if (!search.testimony || loading) return;
    const t = testimonies.find((x) => x.id === search.testimony);
    if (t) setReadingTestimony(t);
  }, [search.testimony, loading, testimonies]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || submitting || !userId) return;
    setSubmitting(true);

    const { error } = await supabase.from("testimonies").insert({
      user_id: userId,
      title: "",
      body: body.trim(),
      is_public: isPublic,
      ...(burdenId ? { burden_id: burdenId } : {}),
    } as any);

    if (!error) {
      setBody("");
      setIsPublic(true);
      setShowForm(false);
      if (burdenId) navigate({ to: "/home", search: {}, replace: true });
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
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              Home
            </h1>
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
            {burdenId && <p className="mb-2 text-xs text-muted-foreground">🕊️ Sharing how God lifted your burden</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What is God doing in your life today?"
                rows={3}
                aria-label="Share a testimony"
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
                </div>
                <button
                  type="submit"
                  disabled={submitting || !body.trim()}
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
              Public Home
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

        {tab === "public" && newPostIds.length > 0 && (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={() => void revealNewPosts()}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-primary shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
            >
              ↑ {newPostIds.length} new {newPostIds.length === 1 ? "testimony" : "testimonies"}
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
              <TestimonyCard
                key={t.id}
                testimony={t}
                userId={userId}
                onAuthRequired={userId ? undefined : openAuthPrompt}
                onClick={() => setReadingTestimony(t)}
                onEdit={() => { setEditingTestimony(t); setEditBody(t.body); }}
                onDelete={() => setDeleteConfirmId(t.id)}
              />
            ))}
          </div>
        )}
      </main>
      {readingTestimony && (
        <ReadingOverlay
          testimony={readingTestimony}
          userId={userId}
          onAuthRequired={userId ? undefined : openAuthPrompt}
          onClose={() => setReadingTestimony(null)}
        />
      )}
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
      {editingTestimony && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" style={{ backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Edit testimony</h3>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={5}
              className="mt-3 w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditingTestimony(null); setEditBody(""); }}
                className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={savingEdit || !editBody.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" style={{ backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
            <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Delete this post?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Are you sure you want to delete this post? This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTestimony(deleteConfirmId)}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}