import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — Testimonies" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthedUserId(data.user?.id ?? null);
      setAuthChecked(true);
      if (data.user) {
        supabase
          .from("profiles")
          .select("display_name, bio")
          .eq("user_id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setDisplayName(profile.display_name || "");
              setBio(profile.bio || "");
            }
            setLoading(false);
          });
      }
    });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim() })
      .eq("user_id", user.id);

    setMessage(error ? "Failed to save." : "Saved!");
    setSaving(false);
  };

  if (authChecked && !authedUserId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Sign in to access settings</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create an account or sign in to manage your profile.</p>
          <button onClick={openAuthPrompt} className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90">Get Started</button>
        </div>
        <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
          Settings
        </h1>
        {loading ? (
          <p className="mt-4 text-muted-foreground">Loading...</p>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {message && <span className="text-sm text-muted-foreground">{message}</span>}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}