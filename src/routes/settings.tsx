import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { deleteAccount } from "@/server/account.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — Testimonies" }],
  }),
  component: SettingsPage,
});

const sectionHeading = "text-lg font-bold text-foreground";
const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20";
const amberDivider = (
  <div className="my-6 h-px w-full" style={{ background: "linear-gradient(to right, transparent, #B8860B, transparent)" }} />
);

function SettingsPage() {
  const navigate = useNavigate();
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarMsg, setAvatarMsg] = useState("");
  const [avatarError, setAvatarError] = useState("");

  // Appearance
  const [darkMode, setDarkMode] = useState(false);

  // Account
  const [passwordMsg, setPasswordMsg] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setAuthedUserId(u?.id ?? null);
      setUserEmail(u?.email ?? "");
      setAuthChecked(true);
      if (u) {
        supabase
          .from("profiles")
          .select("display_name, bio, avatar_url, is_public, theme_preference")
          .eq("user_id", u.id)
          .single()
          .then(({ data: p }) => {
            if (p) {
              const pAny = p as any;
              setDisplayName(pAny.display_name || "");
              setBio(pAny.bio || "");
              setAvatarUrl(pAny.avatar_url);
              setIsPublic(pAny.is_public ?? true);
              const theme = pAny.theme_preference as string;
              if (theme === "dark") {
                setDarkMode(true);
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
              } else {
                setDarkMode(false);
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
              }
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authedUserId) return;
    setAvatarMsg("");
    setAvatarError("");

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Please choose a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    setUploading(true);
    setUploadProgress(30);

    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[file.type] || "jpg";
    const path = `${authedUserId}/avatar.${ext}`;

    // Remove any prior avatar variants
    await supabase.storage
      .from("avatars")
      .remove([
        `${authedUserId}/avatar.jpg`,
        `${authedUserId}/avatar.png`,
        `${authedUserId}/avatar.webp`,
      ]);
    setUploadProgress(50);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      setAvatarError("Upload failed. Please try again.");
      setUploading(false);
      setUploadProgress(0);
      URL.revokeObjectURL(previewUrl);
      return;
    }

    setUploadProgress(80);

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", authedUserId);

    URL.revokeObjectURL(previewUrl);
    setAvatarUrl(publicUrl);
    setUploadProgress(100);
    setAvatarMsg("Profile photo updated");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { url: publicUrl } }));
    }
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 500);
    setTimeout(() => setAvatarMsg(""), 3000);
  };

  // Save profile
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!authedUserId) return;
    setSaving(true);
    setProfileMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        is_public: isPublic,
      })
      .eq("user_id", authedUserId);

    setProfileMsg(error ? "Failed to save." : "Saved!");
    setSaving(false);
  };

  // Theme toggle
  const handleThemeToggle = async () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    if (authedUserId) {
      await supabase
        .from("profiles")
        .update({ theme_preference: newDark ? "dark" : "light" } as any)
        .eq("user_id", authedUserId);
    }
  };

  // Password reset
  const handlePasswordReset = async () => {
    if (!userEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/settings` : undefined,
    });
    setPasswordMsg(error ? "Failed to send reset email." : "Check your email for a reset link.");
  };

  // Delete account
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      navigate({ to: "/" });
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
    }
  };

  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (authChecked && !authedUserId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
            Sign in to access settings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an account or sign in to manage your profile.
          </p>
          <button
            onClick={openAuthPrompt}
            className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Get Started
          </button>
        </div>
        <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
          Settings
        </h1>

        {loading ? (
          <p className="mt-4 text-muted-foreground">Loading...</p>
        ) : (
          <div className="mt-6 space-y-6">
            {/* ── Section 1: Profile ── */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className={sectionHeading} style={{ fontFamily: "'Georgia', serif" }}>
                Profile
              </h2>

              {/* Avatar */}
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border transition-colors hover:border-primary focus:outline-none"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-lg font-bold text-muted-foreground">
                      {initials}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                  {/* Camera icon overlay */}
                  <span
                    className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-white shadow"
                    style={{ backgroundColor: "#B8860B" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-1.5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or WebP — max 5MB</p>
                  {uploading && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%`, backgroundColor: "#B8860B" }}
                      />
                    </div>
                  )}
                  {avatarMsg && <p className="mt-1.5 text-xs font-medium" style={{ color: "#B8860B" }}>✓ {avatarMsg}</p>}
                  {avatarError && <p className="mt-1.5 text-xs text-destructive">{avatarError}</p>}
                </div>
              </div>

              {/* Fields */}
              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Display Name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Public toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Public Profile</p>
                    <p className="text-xs text-muted-foreground">
                      When off, only you can see your profile and posts.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublic}
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isPublic ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  {profileMsg && <span className="text-sm text-muted-foreground">{profileMsg}</span>}
                </div>
              </form>
            </div>

            {amberDivider}

            {/* ── Section 2: Appearance ── */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className={sectionHeading} style={{ fontFamily: "'Georgia', serif" }}>
                Appearance
              </h2>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark themes.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={darkMode}
                  onClick={handleThemeToggle}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
            </div>

            {amberDivider}

            {/* ── Section 3: Account ── */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className={sectionHeading} style={{ fontFamily: "'Georgia', serif" }}>
                Account
              </h2>

              {/* Email */}
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <input value={userEmail} readOnly className={`${inputClass} cursor-not-allowed opacity-60`} />
              </div>

              {/* Password reset */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Change Password
                </button>
                {passwordMsg && <p className="mt-2 text-sm text-muted-foreground">{passwordMsg}</p>}
              </div>

              {/* Danger zone */}
              <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h3 className="text-sm font-bold text-destructive">Danger Zone</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Permanently delete your account and all associated data.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="mt-3 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
              Delete Account
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete your account and all your posts. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}