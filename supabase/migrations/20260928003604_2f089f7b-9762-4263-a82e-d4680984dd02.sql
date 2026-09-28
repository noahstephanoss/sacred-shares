CREATE POLICY "Admins can view all burdens" ON public.burdens FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete any burden" ON public.burdens FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view all circle messages" ON public.circle_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete any circle message" ON public.circle_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete burden reports" ON public.burden_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete circle reports" ON public.circle_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT DELETE ON public.burden_reports, public.circle_reports TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_burden_reports()
RETURNS TABLE(burden_id uuid, body text, is_anonymous boolean, created_at timestamptz, author_name text, report_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.body, b.is_anonymous, b.created_at,
    COALESCE(NULLIF(btrim(p.display_name),''),'Unknown'), count(r.id)::int
  FROM burden_reports r JOIN burdens b ON b.id = r.burden_id
  LEFT JOIN profiles p ON p.user_id = b.user_id
  WHERE public.has_role(auth.uid(),'admin')
  GROUP BY b.id, p.display_name
  ORDER BY count(r.id) DESC, max(r.created_at) DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_circle_reports()
RETURNS TABLE(message_id uuid, circle_id uuid, body text, created_at timestamptz, author_name text, circle_burden text, report_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.circle_id, m.body, m.created_at,
    COALESCE(NULLIF(btrim(p.display_name),''),'Unknown'), b.body, count(r.id)::int
  FROM circle_reports r JOIN circle_messages m ON m.id = r.message_id
  JOIN burden_circles c ON c.id = m.circle_id JOIN burdens b ON b.id = c.burden_id
  LEFT JOIN profiles p ON p.user_id = m.user_id
  WHERE public.has_role(auth.uid(),'admin')
  GROUP BY m.id, p.display_name, b.body
  ORDER BY count(r.id) DESC, max(r.created_at) DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_open_report_count()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(auth.uid(),'admin') THEN
    (SELECT count(DISTINCT burden_id) FROM burden_reports)::int + (SELECT count(DISTINCT message_id) FROM circle_reports)::int
  ELSE 0 END
$$;
REVOKE EXECUTE ON FUNCTION public.admin_burden_reports(), public.admin_circle_reports(), public.admin_open_report_count() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_burden_reports(), public.admin_circle_reports(), public.admin_open_report_count() TO authenticated;