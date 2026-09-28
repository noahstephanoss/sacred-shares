ALTER TABLE public.testimonies ADD COLUMN IF NOT EXISTS reveal_burden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_testimony_burden()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.burden_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM burdens WHERE id = NEW.burden_id AND user_id = NEW.user_id AND lifted_at IS NOT NULL
      AND (is_anonymous = false OR NEW.reveal_burden = true)
  ) THEN
    NEW.burden_id := NULL;
  END IF;
  RETURN NEW;
END $function$;

UPDATE public.testimonies t SET burden_id = NULL
FROM public.burdens b WHERE b.id = t.burden_id AND b.is_anonymous = true AND t.reveal_burden = false;