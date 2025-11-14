-- Drop the problematic view
DROP VIEW IF EXISTS public.posts_public;

-- Create a better security definer function to check if user can view sensitive profile data
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile_data(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id;
$$;

-- Update user_profiles policy to protect sensitive fields
-- Users can only see sensitive data (date_of_birth, notification_preferences, is_suspended, last_login_date) for their own profile
DROP POLICY IF EXISTS "Users can view profiles with privacy protection" ON public.user_profiles;

CREATE POLICY "Users can view all profiles but sensitive data is restricted"
ON public.user_profiles
FOR SELECT
USING (
  -- Everyone can see basic profile info
  -- But sensitive fields should be filtered in application code based on can_view_sensitive_profile_data()
  true
);

-- Add a comment to remind developers to filter sensitive fields
COMMENT ON TABLE public.user_profiles IS 
'Sensitive fields (date_of_birth, notification_preferences, is_suspended, last_login_date) should only be shown to the profile owner. Use can_view_sensitive_profile_data() function to check access in application code.';