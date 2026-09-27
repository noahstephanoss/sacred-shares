
ALTER TABLE public.burdens ADD COLUMN lifted_at timestamptz;
ALTER TABLE public.testimonies ADD COLUMN burden_id uuid REFERENCES public.burdens(id) ON DELETE SET NULL;

-- Testimony may only link to the author's own, lifted, non-anonymous burden; anonymous links are silently dropped
CREATE OR REPLACE FUNCTION public.guard_testimony_burden()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.burden_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM burdens WHERE id = NEW.burden_id AND user_id = NEW.user_id AND is_anonymous = false AND lifted_at IS NOT NULL
  ) THEN
    NEW.burden_id := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_testimony_burden BEFORE INSERT OR UPDATE OF burden_id ON public.testimonies
FOR EACH ROW EXECUTE FUNCTION public.guard_testimony_burden();

CREATE OR REPLACE VIEW public.burdens_feed AS
SELECT b.id, b.body, b.is_anonymous, b.created_at,
  CASE WHEN b.is_anonymous THEN NULL::uuid ELSE b.user_id END AS user_id,
  b.user_id = auth.uid() AS is_mine,
  b.lifted_at,
  CASE WHEN b.is_anonymous THEN NULL::uuid ELSE (
    SELECT t.id FROM testimonies t WHERE t.burden_id = b.id AND t.is_public = true ORDER BY t.created_at DESC LIMIT 1
  ) END AS testimony_id
FROM burdens b;

-- Only the author can lift; closes the circle as 'lifted'
CREATE OR REPLACE FUNCTION public.lift_burden(_burden uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_burden_author(_burden) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE burdens SET lifted_at = COALESCE(lifted_at, now()) WHERE id = _burden;
  UPDATE burden_circles SET status = 'lifted' WHERE burden_id = _burden AND status = 'open';
  RETURN _burden;
END $$;

CREATE OR REPLACE FUNCTION public.lift_circle_burden(circle uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b uuid;
BEGIN
  IF NOT public.is_circle_author(circle) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT burden_id INTO b FROM burden_circles WHERE id = circle;
  RETURN public.lift_burden(b);
END $$;

REVOKE EXECUTE ON FUNCTION public.lift_burden(uuid), public.lift_circle_burden(uuid), public.guard_testimony_burden() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.lift_burden(uuid), public.lift_circle_burden(uuid) TO authenticated;
