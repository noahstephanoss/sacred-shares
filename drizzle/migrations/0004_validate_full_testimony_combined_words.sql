CREATE OR REPLACE FUNCTION public.validate_home_testimony() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF NEW.story_format NOT IN ('quick','full') THEN RAISE EXCEPTION 'Invalid story format'; END IF;
IF NEW.story_format='full' THEN
IF COALESCE(btrim(NEW.where_i_was),'')='' OR COALESCE(btrim(NEW.what_god_did),'')='' OR COALESCE(btrim(NEW.where_i_am_now),'')='' THEN RAISE EXCEPTION 'Please complete all three parts'; END IF;
NEW.body := btrim(NEW.where_i_was) || E'\n\n' || btrim(NEW.what_god_did) || E'\n\n' || btrim(NEW.where_i_am_now);
ELSE NEW.where_i_was := NULL; NEW.what_god_did := NULL; NEW.where_i_am_now := NULL; END IF;
IF cardinality(regexp_split_to_array(btrim(NEW.body), '\s+')) > 900 THEN RAISE EXCEPTION 'Please keep it under 900 words'; END IF;
RETURN NEW; END $$;