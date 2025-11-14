-- Security Fix: Restrict challenges table access to authenticated users only
-- This prevents anonymous users from tracking challenge authors and team structure

-- Drop the overly permissive policy that allows anyone to view challenges
DROP POLICY IF EXISTS "Challenges are viewable by everyone" ON public.challenges;

-- Create a new policy that requires authentication to view challenges
-- This prevents anonymous tracking of content creators
CREATE POLICY "Authenticated users can view challenges"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (true);

-- Add a comment to document the author_id sensitivity
COMMENT ON COLUMN public.challenges.author_id IS 
  'SEMI-SENSITIVE: Exposes which admin/user created the challenge. Only visible to authenticated users to prevent tracking and harassment.';