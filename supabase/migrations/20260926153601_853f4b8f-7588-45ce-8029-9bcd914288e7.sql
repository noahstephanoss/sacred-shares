CREATE TABLE public.burden_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  burden_id uuid UNIQUE NOT NULL REFERENCES public.burdens(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','lifted','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz DEFAULT now() + interval '7 days'
);
GRANT SELECT ON public.burden_circles TO anon;
GRANT SELECT, INSERT ON public.burden_circles TO authenticated;
GRANT ALL ON public.burden_circles TO service_role;
ALTER TABLE public.burden_circles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.burden_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('author','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.circle_members TO authenticated;
GRANT ALL ON public.circle_members TO service_role;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_circle_member(circle uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.circle_members WHERE circle_id = circle AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.circle_member_count(circle uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.circle_members WHERE circle_id = circle
$$;

CREATE OR REPLACE FUNCTION public.is_burden_author(_burden uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.burdens WHERE id = _burden AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.can_join_circle(circle uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.burden_circles c
    JOIN public.burden_sitters s ON s.burden_id = c.burden_id AND s.user_id = auth.uid()
    WHERE c.id = circle AND c.status = 'open'
  ) AND public.circle_member_count(circle) < 8
$$;

CREATE OR REPLACE FUNCTION public.is_circle_author(circle uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.burden_circles c JOIN public.burdens b ON b.id = c.burden_id
    WHERE c.id = circle AND b.user_id = auth.uid()
  )
$$;

CREATE POLICY "Anyone can view circles" ON public.burden_circles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authors create circle for own burden" ON public.burden_circles FOR INSERT TO authenticated
  WITH CHECK (public.is_burden_author(burden_id));

CREATE POLICY "Members view circle members" ON public.circle_members FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id));
CREATE POLICY "Author joins own circle" ON public.circle_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'author' AND public.is_circle_author(circle_id));
CREATE POLICY "Sitters join open circle" ON public.circle_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'member' AND public.can_join_circle(circle_id));
CREATE POLICY "Users leave own membership" ON public.circle_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);