
-- Add post_type column
ALTER TABLE public.thinker_posts
ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'post';

-- Add check constraint for post_type
ALTER TABLE public.thinker_posts
ADD CONSTRAINT thinker_posts_post_type_check CHECK (post_type IN ('journal', 'draft', 'post'));

-- Add title column for journal entries
ALTER TABLE public.thinker_posts
ADD COLUMN IF NOT EXISTS title TEXT;

-- Allow users to update their own posts (needed for draft promotion)
CREATE POLICY "Users can update own posts"
ON public.thinker_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
