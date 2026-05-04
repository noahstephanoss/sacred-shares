CREATE TABLE public.insight_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  original_thought TEXT NOT NULL,
  ai_analysis TEXT NOT NULL,
  attack_rating INTEGER NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insight_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archive" ON public.insight_archive FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own archive" ON public.insight_archive FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own archive" ON public.insight_archive FOR DELETE TO authenticated USING (auth.uid() = user_id);