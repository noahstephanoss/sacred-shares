
CREATE TABLE public.thinker_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  attack_rating INTEGER NOT NULL DEFAULT 0,
  ai_analysis TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.thinker_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view thinker posts"
  ON public.thinker_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create own posts"
  ON public.thinker_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.thinker_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_thinker_posts_tags ON public.thinker_posts USING GIN(tags);
CREATE INDEX idx_thinker_posts_created ON public.thinker_posts(created_at DESC);
