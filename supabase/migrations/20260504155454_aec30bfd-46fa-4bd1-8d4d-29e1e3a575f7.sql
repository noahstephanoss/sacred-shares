
CREATE TABLE public.thinker_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.thinker_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id),
  CONSTRAINT valid_vote_type CHECK (vote_type IN ('up', 'down'))
);

ALTER TABLE public.thinker_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvotes are public"
  ON public.thinker_votes FOR SELECT
  TO authenticated
  USING (vote_type = 'up');

CREATE POLICY "Users can view own votes"
  ON public.thinker_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own votes"
  ON public.thinker_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own votes"
  ON public.thinker_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own votes"
  ON public.thinker_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_thinker_votes_post ON public.thinker_votes(post_id);
CREATE INDEX idx_thinker_votes_user ON public.thinker_votes(user_id);

ALTER TABLE public.thinker_posts ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0;
