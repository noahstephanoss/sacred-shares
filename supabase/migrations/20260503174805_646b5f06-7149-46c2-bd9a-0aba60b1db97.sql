CREATE TABLE public.testimonies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonies ENABLE ROW LEVEL SECURITY;

-- Anyone can read public testimonies
CREATE POLICY "Public testimonies are viewable by everyone"
  ON public.testimonies FOR SELECT
  USING (is_public = true);

-- Authors can read their own (including private)
CREATE POLICY "Authors can view their own testimonies"
  ON public.testimonies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authors can create
CREATE POLICY "Users can create their own testimonies"
  ON public.testimonies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authors can update their own
CREATE POLICY "Users can update their own testimonies"
  ON public.testimonies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Authors can delete their own
CREATE POLICY "Users can delete their own testimonies"
  ON public.testimonies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_testimonies_updated_at
  BEFORE UPDATE ON public.testimonies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();