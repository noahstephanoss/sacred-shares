import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";

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
  const [activeTab, setActiveTab] = useState<"profile" | "battlefield">("profile");
  const [archive, setArchive] = useState<ArchivedInsight[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

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

  if (authChecked && !currentUserId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Sign in to view profiles</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create an account or sign in to see user profiles.</p>
          <button onClick={openAuthPrompt} className="mt-6 rounded-full px-8 py-3 text-sm font-semibold transition-colors hover:opacity-90" style={{ backgroundColor: "#92400E", color: "#FDF6EC" }}>Get Started</button>
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
                  style={activeTab === "profile" ? { borderColor: "#92400E" } : {}}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("battlefield")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "battlefield" ? "border-b-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  style={activeTab === "battlefield" ? { borderColor: "#92400E" } : {}}
                >
                  My Battlefield
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
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#E7D5B3" }}>
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