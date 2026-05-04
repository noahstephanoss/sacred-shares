import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppNav() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [discernInput, setDiscernInput] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const handleDiscernSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!discernInput.trim()) return;
    navigate({ to: "/discernment", search: { prefill: discernInput.trim() } });
    setDiscernInput("");
    setMobileSearchOpen(false);
  };

  return (
    <header className="border-b border-border bg-background px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          to="/"
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Testimonies
        </Link>

        <nav className="flex items-center gap-5">
          {/* Discernment input bar — authenticated only */}
          {user && !isMobile && (
            <form onSubmit={handleDiscernSubmit} className="relative flex items-center">
              <input
                type="text"
                value={discernInput}
                onChange={(e) => setDiscernInput(e.target.value)}
                placeholder="Ask for discernment..."
                className="w-52 rounded-full border border-input bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {discernInput.trim() && (
                <button
                  type="submit"
                  className="absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  aria-label="Send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.638a.75.75 0 0 0 0-1.392L3.105 2.288Z" />
                  </svg>
                </button>
              )}
            </form>
          )}

          {/* Mobile: search icon toggle */}
          {user && isMobile && !mobileSearchOpen && (
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Ask for discernment"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
            </button>
          )}

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
          <Link to="/bible" className="text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-sm text-foreground font-medium" }}>
            Bible
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

      {/* Mobile expanded search bar */}
      {user && isMobile && mobileSearchOpen && (
        <div className="border-t border-border bg-background px-4 py-2">
          <form onSubmit={handleDiscernSubmit} className="relative flex items-center">
            <input
              type="text"
              value={discernInput}
              onChange={(e) => setDiscernInput(e.target.value)}
              placeholder="Ask for discernment..."
              autoFocus
              className="w-full rounded-full border border-input bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => { setMobileSearchOpen(false); setDiscernInput(""); }}
              className="ml-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </header>
  );
}