DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conrelid::regclass::text AS tbl, conname FROM pg_constraint
    WHERE contype='c' AND conrelid IN ('public.burdens'::regclass,'public.circle_messages'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%char_length(body)%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;
ALTER TABLE public.burdens ADD CONSTRAINT burdens_body_max_chars CHECK (char_length(body) BETWEEN 1 AND 6000);
ALTER TABLE public.circle_messages ADD CONSTRAINT circle_messages_body_max_chars CHECK (char_length(body) BETWEEN 1 AND 6000);
ALTER TABLE public.testimonies ADD CONSTRAINT testimonies_body_max_chars CHECK (char_length(body) <= 6000) NOT VALID;
ALTER TABLE public.thinker_posts ADD CONSTRAINT thinker_posts_body_max_chars CHECK (char_length(body) <= 6000) NOT VALID;
ALTER TABLE public.thinker_responses ADD CONSTRAINT thinker_responses_body_max_chars CHECK (char_length(body) <= 6000) NOT VALID;
ALTER TABLE public.verse_comments ADD CONSTRAINT verse_comments_body_max_chars CHECK (char_length(comment_body) <= 6000) NOT VALID;