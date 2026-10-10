CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('testimony','burden','thinker_post','thinker_response','circle_message','verse_comment','blog_post')),
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, reporter_id)
);
GRANT SELECT, INSERT, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users file reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins view reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins dismiss reports" ON public.reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete testimonies" ON public.testimonies FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins view testimonies" ON public.testimonies FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.struggle_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.struggle_tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.struggle_tags TO authenticated;
GRANT ALL ON public.struggle_tags TO service_role;
ALTER TABLE public.struggle_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active tags" ON public.struggle_tags FOR SELECT USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage tags" ON public.struggle_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.struggle_tags (slug,label,sort_order) VALUES
('anxiety','Anxiety',1),('depression','Depression',2),('shame','Shame',3),('lust','Lust',4),
('addiction','Addiction',5),('home-family','Home & family',6),('relationships','Relationships',7),('loneliness','Loneliness',8),
('waiting','Waiting',9),('identity','Identity',10),('grief','Grief',11),('doubt','Doubt',12),
('anger','Anger',13),('forgiveness','Forgiveness',14),('health','Health',15),('school-work','School & work',16);

CREATE TABLE public.post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type text NOT NULL CHECK (post_type IN ('testimony','burden','thinker_post')),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tag_id uuid REFERENCES public.struggle_tags(id) ON DELETE CASCADE,
  other_note text CHECK (other_note IS NULL OR char_length(other_note) BETWEEN 1 AND 100),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((tag_id IS NOT NULL) <> (other_note IS NOT NULL))
);
CREATE UNIQUE INDEX post_tags_unique_tag ON public.post_tags(post_type, post_id, tag_id) WHERE tag_id IS NOT NULL;
CREATE INDEX post_tags_post_idx ON public.post_tags(post_type, post_id);
GRANT SELECT, INSERT, DELETE ON public.post_tags TO authenticated;
GRANT ALL ON public.post_tags TO service_role;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own tags" ON public.post_tags FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners add tags" ON public.post_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners remove tags" ON public.post_tags FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.enforce_post_tag_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT count(*) FROM post_tags WHERE post_type = NEW.post_type AND post_id = NEW.post_id) >= 2 THEN
    RAISE EXCEPTION 'A post can have at most 2 struggle tags';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER post_tags_limit BEFORE INSERT ON public.post_tags FOR EACH ROW EXECUTE FUNCTION public.enforce_post_tag_limit();

CREATE OR REPLACE FUNCTION public.admin_reports()
RETURNS TABLE(target_type text, target_id uuid, report_count int, last_reported timestamptz, body text, author_id uuid, author_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT r.target_type, r.target_id, count(*)::int, max(r.created_at),
    CASE WHEN r.target_type='testimony' THEN t.body END,
    t.user_id,
    COALESCE(NULLIF(btrim(p.display_name),''),'Unknown')
  FROM reports r
  LEFT JOIN testimonies t ON r.target_type='testimony' AND t.id = r.target_id
  LEFT JOIN profiles p ON p.user_id = t.user_id
  WHERE public.has_role(auth.uid(),'admin')
  GROUP BY r.target_type, r.target_id, t.body, t.user_id, p.display_name
  ORDER BY count(*) DESC, max(r.created_at) DESC
$$;