CREATE TABLE public.burden_sitters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  burden_id uuid NOT NULL REFERENCES public.burdens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (burden_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.burden_sitters TO authenticated;
GRANT SELECT ON public.burden_sitters TO anon;
GRANT ALL ON public.burden_sitters TO service_role;
ALTER TABLE public.burden_sitters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sitters" ON public.burden_sitters FOR SELECT USING (true);
CREATE POLICY "Users can add own sitter" ON public.burden_sitters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own sitter" ON public.burden_sitters FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX burden_sitters_burden_id_idx ON public.burden_sitters (burden_id);