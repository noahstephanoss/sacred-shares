import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/profile/$userId")({
  head: () => ({
    meta: [{ title: "Profile — Testimonies" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<{ display_name: string | null; bio: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name, bio, avatar_url")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : profile ? (
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
        ) : (
          <p className="text-center text-muted-foreground">Profile not found.</p>
        )}
      </main>
    </div>
  );
}