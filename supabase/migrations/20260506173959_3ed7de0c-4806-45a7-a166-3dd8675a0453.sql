
-- Add streak columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Server-callable function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, last_active_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last DATE;
  v_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT p.last_active_date, p.current_streak
    INTO v_last, v_streak
    FROM profiles p
   WHERE p.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_last = v_today THEN
    -- Already visited today, return current values
    current_streak := v_streak;
    last_active_date := v_last;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_last = v_today - 1 THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE profiles
     SET current_streak = v_streak,
         last_active_date = v_today
   WHERE user_id = p_user_id;

  current_streak := v_streak;
  last_active_date := v_today;
  RETURN NEXT;
END;
$$;
