-- Add parent_comment_id to comments table for replies
ALTER TABLE public.comments
ADD COLUMN parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add index for faster reply lookups
CREATE INDEX idx_comments_parent_comment_id ON public.comments(parent_comment_id);

-- Add replies_count column to track number of replies
ALTER TABLE public.comments
ADD COLUMN replies_count integer DEFAULT 0;

-- Function to update replies count
CREATE OR REPLACE FUNCTION public.update_comment_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE public.comments 
      SET replies_count = COALESCE(replies_count, 0) + 1
      WHERE id = NEW.parent_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE public.comments 
      SET replies_count = GREATEST(0, COALESCE(replies_count, 0) - 1)
      WHERE id = OLD.parent_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to automatically update replies count
CREATE TRIGGER update_comment_replies_count_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_replies_count();