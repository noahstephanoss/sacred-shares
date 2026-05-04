
CREATE TABLE public.thinker_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.thinker_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  scripture_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_response_type CHECK (type IN ('affirm', 'challenge'))
);

ALTER TABLE public.thinker_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read responses"
  ON public.thinker_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert own responses"
  ON public.thinker_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_thinker_responses_post ON public.thinker_responses(post_id);
