import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  /** Returns true when signed in; otherwise opens the sign-in prompt and returns false. */
  requireAuth: () => boolean;
};

const Ctx = createContext<AuthCtx>({ user: null, loading: true, isAdmin: false, requireAuth: () => false });

export function useSession() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prompt, setPrompt] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setPrompt(true);
    return false;
  }, [user]);

  return (
    <Ctx.Provider value={{ user, loading, isAdmin, requireAuth }}>
      {children}
      {prompt && <SignInPrompt onClose={() => setPrompt(false)} />}
    </Ctx.Provider>
  );
}

function SignInPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-prompt-title"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-2xl text-gold">✝</div>
        <h2 id="signin-prompt-title" className="mt-2 font-serif text-xl text-foreground">Join Testimonies</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to share, pray, and walk with others.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link to="/login" onClick={onClose} className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Sign in or create account
          </Link>
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
