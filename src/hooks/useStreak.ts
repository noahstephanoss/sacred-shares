import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Call once at app root. On each authenticated visit, calls the
 * update_user_streak DB function which handles increment/reset logic.
 */
export function useStreak() {
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      supabase.rpc("update_user_streak", { p_user_id: data.user.id } as any);
    });

    return () => { cancelled = true; };
  }, []);
}