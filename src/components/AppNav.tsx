import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppNav() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setDisplayName(profile.display_name);
              setAvatarUrl(profile.avatar_url);
            }
          });
      }
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = displayName
    ? displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border bg-card px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          to="/"
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Testimonies
        </Link>

        <nav className="flex items-center gap-5">
          <Link to="/feed" className="text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-sm text-foreground font-medium" }}>
            Feed
          </Link>
          <Link to="/discernment" className="text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-sm text-foreground font-medium" }}>
            Discernment
          </Link>
          <Link to="/thinkers" className="text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-sm text-foreground font-medium" }}>
            Thinkers
          </Link>
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-sm text-foreground font-medium" }}>
            Blog
          </Link>

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(!open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </button>

              {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayName || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    to="/profile/$userId"
                    params={{ userId: user.id }}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
                  >
                    View Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
                  >
                    Settings
                  </Link>
                  <div className="border-t border-border">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-secondary"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!user && (
            <Link
              to="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}