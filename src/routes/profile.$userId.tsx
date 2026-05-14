import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

function PaperStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative group mb-6" style={{ perspective: "800px" }}>
      {/* Bottom shadow page */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          transform: "rotate(1.2deg) translateY(4px)",
          zIndex: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      />
      {/* Middle shadow page */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          transform: "rotate(-0.6deg) translateY(2px)",
          zIndex: 1,
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}
      />
      {/* Top page — lifts on hover */}
      <div
        className="relative rounded-lg transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid #B8860B",
          zIndex: 2,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/profile/$userId")({
  head: () => ({
    meta: [{ title: "Profile — Testimonies" }],
  }),
  component: ProfilePage,
});

type ArchivedInsight = {
  id: string;
  original_thought: string;
  ai_analysis: string;
  attack_rating: number;
  saved_at: string;
};

type ThinkerPost = {
  id: string;
  body: string;
  title: string | null;
  tags: string[];
  attack_rating: number;
  ai_analysis: string;
  post_type: string;
  is_public: boolean;
  created_at: string;
};

type Testimony = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type ProfileData = {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_style: number;
  created_at: string;
  current_streak: number;
};

const COVER_GRADIENTS: Record<number, string> = {
  1: "linear-gradient(135deg, #6B3F2A 0%, #2C1810 100%)",
  2: "linear-gradient(135deg, #8B6914 0%, #2C1810 100%)",
  3: "linear-gradient(135deg, #6B3F2A 0%, #1a1a2e 100%)",
  4: "linear-gradient(135deg, #3d1f0a 0%, #6B3F2A 50%, #B8860B 100%)",
  5: "linear-gradient(135deg, #2C1810 0%, #5A3422 30%, #D4B896 100%)",
};

const COVER_NAMES = ["Leather", "Golden Scroll", "Evening Prayer", "Tabernacle", "Parchment"];

function getRatingColor(rating: number) {
  if (rating <= 3) return { bar: "#22c55e", text: "text-green-700", label: "Light resistance" };
  if (rating <= 6) return { bar: "#f59e0b", text: "text-amber-700", label: "Moderate warfare" };
  return { bar: "#ef4444", text: "text-red-700", label: "Heavy assault" };
}

type TabId = "testimonies" | "thinkers" | "battlefield" | "drafts" | "journal";

function ProfilePage() {
  const { userId } = Route.useParams();
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("testimonies");

  // Data states
  const [archive, setArchive] = useState<ArchivedInsight[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [drafts, setDrafts] = useState<ThinkerPost[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [journals, setJournals] = useState<ThinkerPost[]>([]);
  const [journalsLoading, setJournalsLoading] = useState(false);
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [testimoniesLoading, setTestimoniesLoading] = useState(false);
  const [publicPosts, setPublicPosts] = useState<ThinkerPost[]>([]);
  const [publicPostsLoading, setPublicPostsLoading] = useState(false);

  // Stats
  const [testimoniesCount, setTestimoniesCount] = useState(0);
  const [thoughtsCount, setThoughtsCount] = useState(0);

  // Cover picker
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Edit draft
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const isOwnProfile = currentUserId === userId;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  // Load profile
  useEffect(() => {
    if (!authChecked) return;
    if (!currentUserId) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("display_name, bio, avatar_url, cover_style, created_at, current_streak")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setProfile(data as ProfileData | null);
        setLoading(false);
      });
  }, [userId, authChecked, currentUserId]);

  // Load stats
  useEffect(() => {
    if (!authChecked) return;
    supabase.from("testimonies").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_public", true).then(({ count }) => setTestimoniesCount(count ?? 0));
    supabase.from("thinker_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("post_type", "post").eq("is_public", true).then(({ count }) => setThoughtsCount(count ?? 0));
  }, [userId, authChecked]);

  // Load testimonies
  useEffect(() => {
    if (activeTab !== "testimonies") return;
    setTestimoniesLoading(true);
    supabase.from("testimonies").select("id, title, body, created_at").eq("user_id", userId).eq("is_public", true).order("created_at", { ascending: false }).then(({ data }) => {
      setTestimonies((data as Testimony[]) || []);
      setTestimoniesLoading(false);
    });
  }, [activeTab, userId]);

  // Load public thinker posts
  useEffect(() => {
    if (activeTab !== "thinkers") return;
    setPublicPostsLoading(true);
    supabase.from("thinker_posts").select("*").eq("user_id", userId).eq("post_type", "post").eq("is_public", true).order("created_at", { ascending: false }).then(({ data }) => {
      setPublicPosts((data as ThinkerPost[]) || []);
      setPublicPostsLoading(false);
    });
  }, [activeTab, userId]);

  // Load battlefield
  useEffect(() => {
    if (!isOwnProfile || activeTab !== "battlefield") return;
    setArchiveLoading(true);
    supabase.from("insight_archive").select("id, original_thought, ai_analysis, attack_rating, saved_at").eq("user_id", userId).order("saved_at", { ascending: false }).then(({ data }) => {
      setArchive((data as ArchivedInsight[]) || []);
      setArchiveLoading(false);
    });
  }, [isOwnProfile, activeTab, userId]);

  // Load drafts
  useEffect(() => {
    if (!isOwnProfile || activeTab !== "drafts") return;
    setDraftsLoading(true);
    supabase.from("thinker_posts").select("*").eq("user_id", userId).eq("post_type", "draft").order("created_at", { ascending: false }).then(({ data }) => {
      setDrafts((data as ThinkerPost[]) || []);
      setDraftsLoading(false);
    });
  }, [isOwnProfile, activeTab, userId]);

  // Load journals
  useEffect(() => {
    if (!isOwnProfile || activeTab !== "journal") return;
    setJournalsLoading(true);
    supabase.from("thinker_posts").select("*").eq("user_id", userId).eq("post_type", "journal").order("created_at", { ascending: false }).then(({ data }) => {
      setJournals((data as ThinkerPost[]) || []);
      setJournalsLoading(false);
    });
  }, [isOwnProfile, activeTab, userId]);

  const handlePromoteDraft = useCallback(async (postId: string) => {
    const { error } = await supabase.from("thinker_posts").update({ post_type: "post", is_public: true }).eq("id", postId).eq("user_id", userId);
    if (!error) {
      setDrafts((prev) => prev.filter((d) => d.id !== postId));
      setThoughtsCount((c) => c + 1);
      toast.success("Your thought is now shared with the community.");
    }
  }, [userId]);

  const handleSaveEdit = useCallback(async (postId: string) => {
    if (!editBody.trim()) return;
    const { error } = await supabase.from("thinker_posts").update({ body: editBody.trim() }).eq("id", postId).eq("user_id", userId);
    if (!error) {
      setDrafts((prev) => prev.map((d) => d.id === postId ? { ...d, body: editBody.trim() } : d));
      setEditingDraft(null);
      toast.success("Draft updated.");
    }
  }, [editBody, userId]);

  const handleCoverChange = useCallback(async (style: number) => {
    await supabase.from("profiles").update({ cover_style: style }).eq("user_id", userId);
    setProfile((p) => p ? { ...p, cover_style: style } : p);
    setShowCoverPicker(false);
  }, [userId]);

  if (authChecked && !currentUserId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Sign in to view profiles</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create an account or sign in to see user profiles.</p>
          <button onClick={openAuthPrompt} className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90">Get Started</button>
        </div>
        <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
      </div>
    );
  }

  const coverGradient = COVER_GRADIENTS[profile?.cover_style ?? 1] || COVER_GRADIENTS[1];

  // Build tabs
  const publicTabs: { id: TabId; label: string }[] = [
    { id: "testimonies", label: "Testimonies" },
    { id: "thinkers", label: "Thinkers" },
  ];
  const privateTabs: { id: TabId; label: string }[] = isOwnProfile
    ? [
        { id: "drafts", label: "My Drafts" },
        { id: "journal", label: "My Journal" },
        { id: "battlefield", label: "My Battlefield" },
      ]
    : [];
  const allTabs = [...publicTabs, ...privateTabs];

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      {loading ? (
        <p className="text-center text-muted-foreground py-24">Loading...</p>
      ) : profile ? (
        <>
          <main className="mx-auto max-w-2xl px-4 pt-8">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover border-4" style={{ borderColor: "var(--background)" }} />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground border-4" style={{ borderColor: "var(--background)" }}>
                  {(profile.display_name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="mt-3 text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
                {profile.display_name || "Anonymous"}
              </h1>
              {profile.bio && <p className="mt-1 text-sm text-muted-foreground text-center max-w-md">{profile.bio}</p>}

              {/* Stats Row */}
              <div className="mt-5 flex gap-10 justify-center">
                {[
                  { value: testimoniesCount, label: "Testimonies" },
                  { value: thoughtsCount, label: "Thoughts" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold" style={{ color: "#B8860B", fontFamily: "'Georgia', serif" }}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground tracking-wide">{s.label}</p>
                  </div>
                ))}
                {/* Candle Streak */}
                <div className="text-center group/candle relative">
                  {(() => {
                    const streak = profile.current_streak ?? 0;
                    const brightness = streak >= 30 ? 1.4 : streak >= 7 ? 1.0 : 0.6;
                    const goldShadow = streak >= 30 ? "0 0 8px rgba(184,134,11,0.5)" : "none";
                    const displayText = streak <= 1 ? "Begin your journey" : String(streak);
                    return (
                      <>
                        <div className="flex items-center justify-center gap-1">
                          <span style={{ filter: `brightness(${brightness})`, fontSize: "1.5rem", transition: "filter 0.3s ease" }}>🕯️</span>
                          <p className="text-2xl font-bold" style={{ color: "#B8860B", fontFamily: "'Georgia', serif", textShadow: goldShadow }}>
                            {streak <= 1 ? "" : streak}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground tracking-wide">
                          {streak <= 1 ? "Begin your journey" : "days in the Word"}
                        </p>
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground/90 px-2 py-1 text-[10px] text-background opacity-0 group-hover/candle:opacity-100 transition-opacity pointer-events-none z-10">
                          {streak <= 1 ? "Begin walking in the Word" : `${streak} days walking in the Word`}
                        </div>
                      </>
                    );
                  })()}
                  </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8 flex border-b border-border overflow-x-auto scrollbar-none">
              {allTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-b-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={activeTab === tab.id ? { borderColor: "var(--primary)" } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="py-6">
              {/* Testimonies Tab */}
              {activeTab === "testimonies" && (
                <div className="space-y-4">
                  {testimoniesLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading testimonies...</p>
                  ) : testimonies.length === 0 ? (
                    <EmptyState
                      verse="Your story is worth telling"
                      reference="Romans 10:11"
                      description="Share your first testimony with the community."
                    />
                  ) : (
                    testimonies.map((t) => (
                      <div key={t.id} className="rounded-xl border border-border bg-card p-5">
                        <h3 className="text-base font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>{t.title}</h3>
                        <p className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{t.body}</p>
                        <p className="mt-3 text-[10px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Thinkers Tab */}
              {activeTab === "thinkers" && (
                <div className="space-y-4">
                  {publicPostsLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading thoughts...</p>
                  ) : publicPosts.length === 0 ? (
                    <EmptyState
                      verse="Iron sharpens iron"
                      reference="Proverbs 27:17"
                      description="Share a thought and let the community sharpen you."
                    />
                  ) : (
                    publicPosts.map((post) => {
                      const color = getRatingColor(post.attack_rating);
                      return (
                        <div key={post.id} className="rounded-xl border border-border bg-card p-5">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.body}</p>
                          {post.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {post.tags.map((t) => (
                                <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--border)", color: "var(--primary)" }}>{t}</span>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-3">
                            <span className={`text-lg font-bold ${color.text}`}>{post.attack_rating}/10</span>
                            <span className="text-xs text-muted-foreground">{color.label}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
                            <div className="h-full rounded-full" style={{ backgroundColor: color.bar, width: `${post.attack_rating * 10}%` }} />
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{post.ai_analysis}</p>
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Battlefield Tab */}
              {activeTab === "battlefield" && isOwnProfile && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Your personal war journal — every battle analyzed, every lesson preserved.
                  </p>
                  {archiveLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading archive...</p>
                  ) : archive.length === 0 ? (
                    <EmptyState
                      verse="Know your enemy, know your ground"
                      reference="Ephesians 6:12"
                      description="Save an analysis from Thinkers to begin your war journal."
                    />
                  ) : (
                    archive.map((item, idx) => {
                      const color = getRatingColor(item.attack_rating);
                      return (
                        <PaperStack key={item.id}>
                          <p className="text-sm text-foreground leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>{item.original_thought}</p>
                          <div className="mt-3 flex items-center gap-3">
                            <span className={`text-lg font-bold ${color.text}`}>{item.attack_rating}/10</span>
                            <span className="text-xs text-muted-foreground">{color.label}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
                            <div className="h-full rounded-full" style={{ backgroundColor: color.bar, width: `${item.attack_rating * 10}%` }} />
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.ai_analysis}</p>
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {new Date(item.saved_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </PaperStack>
                      );
                    })
                  )}
                </div>
              )}

              {/* Drafts Tab */}
              {activeTab === "drafts" && isOwnProfile && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Private drafts — promote to the community when you're ready.
                  </p>
                  {draftsLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading drafts...</p>
                  ) : drafts.length === 0 ? (
                    <EmptyState
                      verse="A thought refined is a testimony prepared"
                      reference=""
                      description="Write, refine, then share with the community."
                    />
                  ) : (
                    drafts.map((item) => {
                      const color = getRatingColor(item.attack_rating);
                      const isEditing = editingDraft === item.id;
                      return (
                        <div key={item.id} className="rounded-xl border border-border bg-card p-5">
                          {isEditing ? (
                            <div className="space-y-3">
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={4}
                                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveEdit(item.id)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Save</button>
                                <button onClick={() => setEditingDraft(null)} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-foreground leading-relaxed">{item.body}</p>
                              {item.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {item.tags.map((t) => (
                                    <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--border)", color: "var(--primary)" }}>{t}</span>
                                  ))}
                                </div>
                              )}
                              {item.attack_rating > 0 && (
                                <>
                                  <div className="mt-3 flex items-center gap-3">
                                    <span className={`text-lg font-bold ${color.text}`}>{item.attack_rating}/10</span>
                                    <span className="text-xs text-muted-foreground">{color.label}</span>
                                  </div>
                                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
                                    <div className="h-full rounded-full" style={{ backgroundColor: color.bar, width: `${item.attack_rating * 10}%` }} />
                                  </div>
                                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.ai_analysis}</p>
                                </>
                              )}
                              <div className="mt-3 flex items-center justify-between">
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setEditingDraft(item.id); setEditBody(item.body); }}
                                    className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                                    style={{ border: "1px solid var(--primary)", color: "var(--primary)" }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handlePromoteDraft(item.id)}
                                    className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                  >
                                    📢 Make Public
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Journal Tab — notebook style */}
              {activeTab === "journal" && isOwnProfile && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground italic mb-6" style={{ fontFamily: "'Georgia', serif" }}>
                    Your private journal — these entries stay between you and God.
                  </p>
                  {journalsLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading journal...</p>
                  ) : journals.length === 0 ? (
                    <EmptyState
                      verse="Pour out your heart before Him"
                      reference="Psalm 62:8"
                      description="This space is yours alone. Write freely."
                    />
                  ) : (
                    <div className="space-y-2">
                      {journals.map((item, idx) => (
                        <PaperStack key={item.id}>
                          {item.title && (
                            <h3
                              className="text-lg font-bold text-foreground mb-2"
                              style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.01em" }}
                            >
                              {item.title}
                            </h3>
                          )}
                          <p
                            className="text-sm text-foreground leading-[1.8] whitespace-pre-wrap"
                            style={{ fontFamily: "'Georgia', serif" }}
                          >
                            {item.body}
                          </p>
                          <p className="mt-4 text-[10px] text-muted-foreground italic">
                            {new Date(item.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </PaperStack>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-24">Profile not found.</p>
      )}
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}