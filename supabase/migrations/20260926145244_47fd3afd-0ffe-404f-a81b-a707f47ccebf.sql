CREATE TABLE public.burdens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.burdens TO authenticated;
GRANT ALL ON public.burdens TO service_role;
ALTER TABLE public.burdens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own burdens" ON public.burdens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own burdens" ON public.burdens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own burdens" ON public.burdens FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE VIEW public.burdens_feed AS
SELECT id, body, is_anonymous, created_at,
  CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
  (user_id = auth.uid()) AS is_mine
FROM public.burdens;
GRANT SELECT ON public.burdens_feed TO anon, authenticated;