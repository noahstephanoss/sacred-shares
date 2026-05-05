import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { toast } from "sonner";

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

function getRatingColor(rating: number) {
  if (rating <= 3) return { bar: "#22c55e", text: "text-green-700", label: "Light resistance" };
  if (rating <= 6) return { bar: "#f59e0b", text: "text-amber-700", label: "Moderate warfare" };
  return { bar: "#ef4444", text: "text-red-700", label: "Heavy assault" };
}

function ProfilePage() {
  const { userId } = Route.useParams();
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string | null; bio: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "battlefield" | "drafts" | "journal">("profile");
  const [archive, setArchive] = useState<ArchivedInsight[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [drafts, setDrafts] = useState<ThinkerPost[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [journals, setJournals] = useState<ThinkerPost[]>([]);
  const [journalsLoading, setJournalsLoading] = useState(false);

  const isOwnProfile = currentUserId === userId;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!currentUserId) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("display_name, bio, avatar_url")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [userId, authChecked, currentUserId]);

  useEffect(() => {
    if (!isOwnProfile || activeTab !== "battlefield") return;
    setArchiveLoading(true);
    supabase
      .from("insight_archive")
      .select("id, original_thought, ai_analysis, attack_rating, saved_at")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false })
      .then(({ data }) => {
        setArchive((data as ArchivedInsight[]) || []);
        setArchiveLoading(false);
      });
  }, [isOwnProfile, activeTab, userId]);

  // Load drafts
  useEffect(() => {
    if (!isOwnProfile || activeTab !== "drafts") return;
    setDraftsLoading(true);
    supabase
      .from("thinker_posts")
      .select("*")
      .eq("user_id", userId)
      .eq("post_type", "draft")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDrafts((data as ThinkerPost[]) || []);
        setDraftsLoading(false);
      });
  }, [isOwnProfile, activeTab, userId]);

  // Load journals
  useEffect(() => {
    if (!isOwnProfile || activeTab !== "journal") return;
    setJournalsLoading(true);
    supabase
      .from("thinker_posts")
      .select("*")
      .eq("user_id", userId)
      .eq("post_type", "journal")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setJournals((data as ThinkerPost[]) || []);
        setJournalsLoading(false);
      });
  }, [isOwnProfile, activeTab, userId]);

  const handlePromoteDraft = async (postId: string) => {
    const { error } = await supabase
      .from("thinker_posts")
      .update({ post_type: "post", is_public: true })
      .eq("id", postId)
      .eq("user_id", userId);
    if (!error) {
      setDrafts((prev) => prev.filter((d) => d.id !== postId));
      toast.success("Your thought is now shared with the community.");
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : profile ? (
          <div>
          <div className="text-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                {(profile.display_name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="mt-4 text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              {profile.display_name || "Anonymous"}
            </h1>
            {profile.bio && <p className="mt-2 text-muted-foreground">{profile.bio}</p>}
          </div>

          {/* Tabs — only show if own profile */}
          {isOwnProfile && (
            <>
              <div className="mt-8 flex border-b border-border">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "profile" ? "border-b-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={activeTab === "profile" ? { borderColor: "var(--primary)" } : {}}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("battlefield")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "battlefield" ? "border-b-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={activeTab === "battlefield" ? { borderColor: "var(--primary)" } : {}}
                >
                  My Battlefield
                </button>
                <button
                  onClick={() => setActiveTab("drafts")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "drafts" ? "border-b-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={activeTab === "drafts" ? { borderColor: "var(--primary)" } : {}}
                >
                  My Drafts
                </button>
                <button
                  onClick={() => setActiveTab("journal")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "journal" ? "border-b-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={activeTab === "journal" ? { borderColor: "var(--primary)" } : {}}
                >
                  My Journal
                </button>
              </div>

              {activeTab === "battlefield" && (
                <div className="mt-6 space-y-4">
                  <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Your personal war journal — every battle analyzed, every lesson preserved.
                  </p>
                  {archiveLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading archive...</p>
                  ) : archive.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No saved analyses yet. Visit Thinkers to begin.</p>
                  ) : (
                    archive.map((item) => {
                      const color = getRatingColor(item.attack_rating);
                      return (
                        <div key={item.id} className="rounded-xl border border-border bg-card p-5">
                          <p className="text-sm text-foreground leading-relaxed">{item.original_thought}</p>
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
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "drafts" && (
                <div className="mt-6 space-y-4">
                  <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Private drafts — promote to the community when you're ready.
                  </p>
                  {draftsLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading drafts...</p>
                  ) : drafts.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No drafts yet. Use Draft mode in Thinkers to save private thoughts.</p>
                  ) : (
                    drafts.map((item) => {
                      const color = getRatingColor(item.attack_rating);
                      return (
                        <div key={item.id} className="rounded-xl border border-border bg-card p-5">
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
                            <button
                              onClick={() => handlePromoteDraft(item.id)}
                              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              📢 Make Public
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "journal" && (
                <div className="mt-6 space-y-4">
                  <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Your private journal — these entries stay between you and God.
                  </p>
                  {journalsLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Loading journal...</p>
                  ) : journals.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No journal entries yet. Use Journal mode in Thinkers to begin.</p>
                  ) : (
                    journals.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border bg-card p-5">
                        {item.title && (
                          <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Georgia', serif" }}>{item.title}</h3>
                        )}
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.body}</p>
                        <p className="mt-3 text-[10px] text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Profile not found.</p>
        )}
      </main>
    </div>
  );
}