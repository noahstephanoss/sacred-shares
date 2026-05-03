import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const LIMITS = { discernment: 20, thinkers: 5 } as const;
type Feature = keyof typeof LIMITS;

export function useDailyLimit(feature: Feature) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = LIMITS[feature];
  const remaining = Math.max(0, limit - count);
  const isAtLimit = count >= limit;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase.rpc("get_daily_usage", { _user_id: user.id });
      if (data && data.length > 0) {
        const row = data[0] as { discernment_count: number; thinkers_count: number };
        setCount(feature === "discernment" ? row.discernment_count : row.thinkers_count);
      }
      setLoading(false);
    }
    load();
  }, [feature]);

  const increment = useCallback(async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc("increment_usage", {
      _user_id: user.id,
      _field: feature,
    });

    if (error) return false;
    const newCount = data as number;
    setCount(newCount);
    return newCount <= limit;
  }, [feature, limit]);

  return { count, limit, remaining, isAtLimit, loading, increment };
}