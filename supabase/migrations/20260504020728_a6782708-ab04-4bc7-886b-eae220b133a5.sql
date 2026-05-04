CREATE TABLE public.verse_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER,
  comment_body TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.verse_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public comments viewable by all" ON public.verse_comments FOR SELECT USING (is_public = true);

CREATE POLICY "Users view own comments" ON public.verse_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own comments" ON public.verse_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);