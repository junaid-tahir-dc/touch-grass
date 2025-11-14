-- Security Fix: Restrict user_profiles access to authenticated users only
-- This prevents anonymous scraping of user personal data

-- Drop the overly permissive policy that allows anyone to view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;

-- Create a new policy that requires authentication to view profiles
-- This prevents anonymous users from scraping user data
CREATE POLICY "Authenticated users can view public profile data"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a helper function to determine if sensitive fields should be visible
-- Only the profile owner can see their own sensitive fields
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile_data(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id;
$$;

-- Note: PostgreSQL RLS doesn't support column-level restrictions easily,
-- so sensitive fields (date_of_birth, notification_preferences) should be
-- filtered in the application layer. Only return these fields when the
-- authenticated user is viewing their own profile.

-- Add a comment to document which fields should be considered sensitive
COMMENT ON COLUMN public.user_profiles.date_of_birth IS 
  'SENSITIVE: Only show to profile owner (auth.uid() = user_id)';
COMMENT ON COLUMN public.user_profiles.notification_preferences IS 
  'SENSITIVE: Only show to profile owner (auth.uid() = user_id)';
COMMENT ON COLUMN public.user_profiles.last_seen_at IS 
  'SEMI-SENSITIVE: Use for online status, but consider privacy implications';
COMMENT ON COLUMN public.user_profiles.is_online IS 
  'SEMI-SENSITIVE: Derived from last_seen_at, shows real-time user activity';
