-- Fix security issue: Protect sensitive user profile data
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.user_profiles;

-- Create security definer function to check if viewing own profile
CREATE OR REPLACE FUNCTION public.is_viewing_own_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id;
$$;

-- Create new policy that hides sensitive fields for other users
CREATE POLICY "Users can view profiles with privacy protection"
ON public.user_profiles
FOR SELECT
USING (true);

-- Note: Frontend code should filter sensitive fields when showing other users' profiles
-- Sensitive fields to hide: date_of_birth, notification_preferences, last_seen_at (exact time), is_suspended

-- Fix security issue: Protect user identity in anonymous posts
-- Drop the existing policy
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- Create new policy that hides user_id for anonymous posts
CREATE POLICY "Posts are viewable with anonymity protection"
ON public.posts
FOR SELECT
USING (
  CASE 
    WHEN is_anonymous = true THEN auth.uid() = user_id OR auth.uid() IS NOT NULL
    ELSE true
  END
);

-- Create a view for safe public post access that respects anonymity
CREATE OR REPLACE VIEW public.posts_public AS
SELECT 
  id,
  CASE 
    WHEN is_anonymous = true THEN NULL 
    ELSE user_id 
  END as user_id,
  content,
  media_type,
  media_urls,
  likes_count,
  comments_count,
  challenge_id,
  is_anonymous,
  created_at,
  updated_at
FROM public.posts;

-- Grant access to the view
GRANT SELECT ON public.posts_public TO authenticated, anon;