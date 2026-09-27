CREATE TABLE public.burden_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  burden_id uuid NOT NULL REFERENCES public.burdens(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (burden_id, reporter_id)
);
GRANT SELECT, INSERT ON public.burden_reports TO authenticated;
GRANT ALL ON public.burden_reports TO service_role;
ALTER TABLE public.burden_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users report as themselves" ON public.burden_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins read burden reports" ON public.burden_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.circle_reports TO authenticated;
CREATE POLICY "Admins read circle reports" ON public.circle_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));