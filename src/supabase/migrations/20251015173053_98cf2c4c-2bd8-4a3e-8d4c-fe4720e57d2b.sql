-- Security Fix: Restrict post_likes access to authenticated users only
-- This prevents anonymous tracking of user behavior and activity patterns

-- Drop the overly permissive policy that allows anyone to view post likes
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;

-- Create a new policy that requires authentication to view post likes
-- This prevents anonymous users from building user behavior profiles
CREATE POLICY "Authenticated users can view post likes"
  ON public.post_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Add a comment to document the privacy consideration
COMMENT ON TABLE public.post_likes IS 
  'PRIVACY-SENSITIVE: Contains user activity data. Viewing restricted to authenticated users to prevent behavior tracking and profiling.';