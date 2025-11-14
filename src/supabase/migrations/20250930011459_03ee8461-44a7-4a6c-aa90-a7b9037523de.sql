
-- Fix existing posts with incorrect like counts
UPDATE posts p
SET likes_count = (
  SELECT COUNT(*)::integer
  FROM post_likes pl
  WHERE pl.post_id = p.id
);

-- Add check constraint to prevent negative like counts
ALTER TABLE posts 
ADD CONSTRAINT likes_count_non_negative 
CHECK (likes_count >= 0);

-- Update the trigger function to prevent negative counts
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
