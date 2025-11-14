
-- Fix existing posts with incorrect comment counts
UPDATE posts p
SET comments_count = (
  SELECT COUNT(*)::integer
  FROM comments c
  WHERE c.post_id = p.id
);

-- Create trigger function to update comment counts
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET comments_count = GREATEST(0, comments_count - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for comment inserts
CREATE TRIGGER comments_count_insert_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_comments_count();

-- Create trigger for comment deletes
CREATE TRIGGER comments_count_delete_trigger
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_comments_count();
