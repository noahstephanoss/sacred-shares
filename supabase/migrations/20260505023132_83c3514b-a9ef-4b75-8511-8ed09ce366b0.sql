-- Create testimony_reactions table
CREATE TABLE public.testimony_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  testimony_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT testimony_reactions_type_check CHECK (type IN ('praying', 'amen', 'peace')),
  CONSTRAINT testimony_reactions_unique UNIQUE (testimony_id, user_id, type)
);

-- Index for fast lookups
CREATE INDEX idx_testimony_reactions_testimony ON public.testimony_reactions (testimony_id);
CREATE INDEX idx_testimony_reactions_user ON public.testimony_reactions (user_id);

-- Enable RLS
ALTER TABLE public.testimony_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reactions"
ON public.testimony_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add own reactions"
ON public.testimony_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
ON public.testimony_reactions FOR DELETE
USING (auth.uid() = user_id);