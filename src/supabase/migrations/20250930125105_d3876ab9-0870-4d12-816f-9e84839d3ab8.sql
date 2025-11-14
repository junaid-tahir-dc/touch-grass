-- Make user_id NOT NULL in comments table
-- This is critical for RLS security and preventing null user_id issues
ALTER TABLE public.comments 
ALTER COLUMN user_id SET NOT NULL;

-- Make user_id NOT NULL in post_likes table
-- This is critical for RLS security and preventing null user_id issues
ALTER TABLE public.post_likes 
ALTER COLUMN user_id SET NOT NULL;

-- Make post_id NOT NULL in comments table for data integrity
ALTER TABLE public.comments 
ALTER COLUMN post_id SET NOT NULL;

-- Make post_id NOT NULL in post_likes table for data integrity
ALTER TABLE public.post_likes 
ALTER COLUMN post_id SET NOT NULL;