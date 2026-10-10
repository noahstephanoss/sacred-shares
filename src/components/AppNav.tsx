import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Home, Lightbulb, MessageCircle, Newspaper, User, HeartHandshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/burdens", label: "Burdens", icon: HeartHandshake },
  { to: "/thinkers", label: "Thinkers", icon: Lightbulb },
  { to: "/bible", label: "Bible", icon: BookOpen },
  { to: "/discernment", label: "Discernment", icon: MessageCircle },
  { to: "/blog", label: "Blog", icon: Newspaper },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppNav() {
  const navigate = useNavigate();
  const { user } = useSession();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-serif text-xl text-foreground">
            <span className="text-gold">✝</span>
            Testimonies
          </Link>

          <nav className="hidden items-center gap-5 md:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-sm font-medium text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            ) : (
              <Link to="/login" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-7">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground"
                activeProps={{ className: "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-primary" }}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-8 pb-28 md:pb-12">{children}</main>
    </div>
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="py-16 text-center">
      <div className="text-3xl text-gold">✝</div>
      <h1 className="mt-4 font-serif text-3xl text-foreground">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">This section is being prepared.</p>
    </div>
  );
}

