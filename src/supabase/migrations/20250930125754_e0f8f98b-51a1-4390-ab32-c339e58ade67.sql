-- Ensure trigger exists for updating comments_count on posts
BEGIN;

-- Create the trigger to keep comments_count in sync
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON public.comments;
CREATE TRIGGER update_post_comments_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

-- One-time backfill to fix existing incorrect counts
UPDATE public.posts p
SET comments_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT c.post_id, COUNT(*)::int AS cnt
  FROM public.comments c
  GROUP BY c.post_id
) sub
WHERE p.id = sub.post_id;

-- Also ensure posts with no comments are zeroed (in case of NULLs)
UPDATE public.posts
SET comments_count = 0
WHERE comments_count IS NULL;

COMMIT;