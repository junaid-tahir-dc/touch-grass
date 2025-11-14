BEGIN;

-- Ensure trigger function coalesces NULL counts
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Recreate trigger to ensure it's attached
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON public.post_likes;
CREATE TRIGGER update_post_likes_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

-- Backfill likes_count for existing posts
UPDATE public.posts p
SET likes_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT post_id, COUNT(*)::int AS cnt
  FROM public.post_likes
  GROUP BY post_id
) sub
WHERE p.id = sub.post_id;

-- Zero any remaining NULLs (posts without likes)
UPDATE public.posts
SET likes_count = 0
WHERE likes_count IS NULL;

COMMIT;