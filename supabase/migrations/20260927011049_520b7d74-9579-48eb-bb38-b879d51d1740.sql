
-- Tighten: members only see their own membership row (identities come through masked functions)
DROP POLICY IF EXISTS "Members view circle members" ON public.circle_members;
CREATE POLICY "Users view own membership" ON public.circle_members FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.circle_is_active(circle uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.burden_circles WHERE id = circle AND status = 'open' AND (ends_at IS NULL OR now() < ends_at))
$$;

CREATE TABLE public.circle_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.burden_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  is_update boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.circle_messages(circle_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.circle_messages TO authenticated;
GRANT ALL ON public.circle_messages TO service_role;
ALTER TABLE public.circle_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own messages" ON public.circle_messages FOR SELECT TO authenticated USING (auth.uid() = user_id AND public.is_circle_member(circle_id));
CREATE POLICY "Members post while active" ON public.circle_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_circle_member(circle_id) AND public.circle_is_active(circle_id) AND (is_update = false OR public.is_circle_author(circle_id)));
CREATE POLICY "Users delete own messages" ON public.circle_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.circle_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.burden_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  prayed_on date NOT NULL DEFAULT current_date,
  UNIQUE (circle_id, user_id, prayed_on)
);
GRANT SELECT, INSERT, DELETE ON public.circle_prayers TO authenticated;
GRANT ALL ON public.circle_prayers TO service_role;
ALTER TABLE public.circle_prayers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own prayers" ON public.circle_prayers FOR SELECT TO authenticated USING (auth.uid() = user_id AND public.is_circle_member(circle_id));
CREATE POLICY "Members pray while active" ON public.circle_prayers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_circle_member(circle_id) AND public.circle_is_active(circle_id));
CREATE POLICY "Users delete own prayers" ON public.circle_prayers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.circle_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.burden_circles(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.circle_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.circle_reports TO authenticated;
GRANT ALL ON public.circle_reports TO service_role;
ALTER TABLE public.circle_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members report messages" ON public.circle_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND public.is_circle_member(circle_id)
    AND EXISTS (SELECT 1 FROM public.circle_messages m WHERE m.id = message_id AND m.circle_id = circle_reports.circle_id));

-- Overview for members only
CREATE OR REPLACE FUNCTION public.get_circle_overview(circle uuid)
RETURNS TABLE(burden_body text, is_anonymous boolean, status text, ends_at timestamptz, is_author boolean, prayed_today int, i_prayed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.body, b.is_anonymous, c.status, c.ends_at, (b.user_id = auth.uid()),
    (SELECT count(*)::int FROM circle_prayers p WHERE p.circle_id = c.id AND p.prayed_on = current_date),
    EXISTS (SELECT 1 FROM circle_prayers p WHERE p.circle_id = c.id AND p.prayed_on = current_date AND p.user_id = auth.uid())
  FROM burden_circles c JOIN burdens b ON b.id = c.burden_id
  WHERE c.id = circle AND public.is_circle_member(circle)
$$;

CREATE OR REPLACE FUNCTION public.get_circle_members(circle uuid)
RETURNS TABLE(member_id uuid, role text, display_name text, avatar_url text, is_masked boolean, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.role,
    CASE WHEN masked THEN 'Anonymous' ELSE p.display_name END,
    CASE WHEN masked THEN NULL ELSE p.avatar_url END,
    masked, m.user_id = auth.uid()
  FROM circle_members m
  JOIN burden_circles c ON c.id = m.circle_id
  JOIN burdens b ON b.id = c.burden_id
  LEFT JOIN profiles p ON p.user_id = m.user_id
  CROSS JOIN LATERAL (SELECT (m.role = 'author' AND b.is_anonymous) AS masked) x
  WHERE m.circle_id = circle AND public.is_circle_member(circle)
  ORDER BY (m.role = 'author') DESC, m.joined_at
$$;

CREATE OR REPLACE FUNCTION public.get_circle_messages(circle uuid)
RETURNS TABLE(id uuid, body text, is_update boolean, created_at timestamptz, display_name text, avatar_url text, is_masked boolean, is_author boolean, is_mine boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT msg.id, msg.body, msg.is_update, msg.created_at,
    CASE WHEN masked THEN 'Anonymous' ELSE p.display_name END,
    CASE WHEN masked THEN NULL ELSE p.avatar_url END,
    masked, is_auth, msg.user_id = auth.uid()
  FROM circle_messages msg
  JOIN burden_circles c ON c.id = msg.circle_id
  JOIN burdens b ON b.id = c.burden_id
  LEFT JOIN profiles p ON p.user_id = msg.user_id
  CROSS JOIN LATERAL (SELECT (msg.user_id = b.user_id) AS is_auth, (msg.user_id = b.user_id AND b.is_anonymous) AS masked) x
  WHERE msg.circle_id = circle AND public.is_circle_member(circle)
  ORDER BY msg.created_at ASC
$$;

CREATE OR REPLACE FUNCTION public.extend_circle(circle uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v timestamptz;
BEGIN
  IF NOT public.is_circle_author(circle) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE burden_circles SET ends_at = GREATEST(COALESCE(ends_at, now()), now()) + interval '7 days'
   WHERE id = circle AND status = 'open' RETURNING ends_at INTO v;
  IF v IS NULL THEN RAISE EXCEPTION 'Circle not open'; END IF;
  RETURN v;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_circle_overview(uuid), public.get_circle_members(uuid), public.get_circle_messages(uuid), public.extend_circle(uuid), public.circle_is_active(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_circle_overview(uuid), public.get_circle_members(uuid), public.get_circle_messages(uuid), public.extend_circle(uuid), public.circle_is_active(uuid) TO authenticated;
