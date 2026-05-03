CREATE TABLE public.daily_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discernment_count INTEGER NOT NULL DEFAULT 0,
  thinkers_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, usage_date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON public.daily_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.daily_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.daily_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Atomic increment function
CREATE OR REPLACE FUNCTION public.increment_usage(_user_id UUID, _field TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_val INTEGER;
BEGIN
  INSERT INTO public.daily_usage (user_id, usage_date, discernment_count, thinkers_count)
  VALUES (_user_id, CURRENT_DATE, 0, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  IF _field = 'discernment' THEN
    UPDATE public.daily_usage
    SET discernment_count = discernment_count + 1
    WHERE user_id = _user_id AND usage_date = CURRENT_DATE
    RETURNING discernment_count INTO current_val;
  ELSIF _field = 'thinkers' THEN
    UPDATE public.daily_usage
    SET thinkers_count = thinkers_count + 1
    WHERE user_id = _user_id AND usage_date = CURRENT_DATE
    RETURNING thinkers_count INTO current_val;
  ELSE
    RAISE EXCEPTION 'Invalid field: %', _field;
  END IF;

  RETURN current_val;
END;
$$;

-- Only authenticated users can call this
REVOKE ALL ON FUNCTION public.increment_usage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT) TO authenticated;

-- Helper to check current usage
CREATE OR REPLACE FUNCTION public.get_daily_usage(_user_id UUID)
RETURNS TABLE(discernment_count INTEGER, thinkers_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(d.discernment_count, 0), COALESCE(d.thinkers_count, 0)
  FROM public.daily_usage d
  WHERE d.user_id = _user_id AND d.usage_date = CURRENT_DATE
  UNION ALL
  SELECT 0, 0
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_daily_usage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_usage(UUID) TO authenticated;