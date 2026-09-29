-- 1. Delete orphaned rows
DELETE FROM public.testimony_reactions r
WHERE NOT EXISTS (SELECT 1 FROM public.testimonies t WHERE t.id = r.testimony_id);

-- 2. Foreign key + index
ALTER TABLE public.testimony_reactions
  ADD CONSTRAINT testimony_reactions_testimony_id_fkey
  FOREIGN KEY (testimony_id) REFERENCES public.testimonies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS testimony_reactions_testimony_id_idx
  ON public.testimony_reactions (testimony_id);

-- 3. Replace the SELECT policy
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.testimony_reactions;
CREATE POLICY "View reactions on visible testimonies" ON public.testimony_reactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.testimonies t WHERE t.id = testimony_reactions.testimony_id)
  );

-- 4. Replace the INSERT policy
DROP POLICY IF EXISTS "Users can add own reactions" ON public.testimony_reactions;
CREATE POLICY "Users react to visible testimonies" ON public.testimony_reactions
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.testimonies t WHERE t.id = testimony_reactions.testimony_id)
  );