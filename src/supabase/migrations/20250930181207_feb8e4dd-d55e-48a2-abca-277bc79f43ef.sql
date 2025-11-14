-- Fix double increments by consolidating triggers for likes and comments
-- 1) Ensure robust count update functions
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts 
      SET likes_count = COALESCE(likes_count, 0) + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts 
      SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts 
      SET comments_count = COALESCE(comments_count, 0) + 1 
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts 
      SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2) Drop duplicate triggers that call these functions, then recreate a single trigger each
DO $$
DECLARE r record;
BEGIN
  -- Drop all triggers on post_likes that execute update_post_likes_count
  FOR r IN 
    SELECT tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'post_likes'
      AND NOT t.tgisinternal
      AND p.proname = 'update_post_likes_count'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.post_likes;', r.tgname);
  END LOOP;
  
  -- Drop all triggers on comments that execute update_post_comments_count
  FOR r IN 
    SELECT tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'comments'
      AND NOT t.tgisinternal
      AND p.proname = 'update_post_comments_count'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.comments;', r.tgname);
  END LOOP;
END $$;

-- 3) Recreate a single canonical trigger for each table
CREATE TRIGGER post_likes_count_trg
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER comments_count_trg
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();