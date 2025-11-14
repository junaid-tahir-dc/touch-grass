-- Create private user profiles table for sensitive data
CREATE TABLE public.user_profiles_private (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  date_of_birth date,
  notification_preferences jsonb DEFAULT '{"chat_messages": true, "challenge_updates": true, "browser_notifications": true}'::jsonb,
  is_suspended boolean NOT NULL DEFAULT false,
  last_login_date date,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on private profiles
ALTER TABLE public.user_profiles_private ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own private data
CREATE POLICY "Users can view their own private data"
ON public.user_profiles_private
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own private data
CREATE POLICY "Users can update their own private data"
ON public.user_profiles_private
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own private data
CREATE POLICY "Users can insert their own private data"
ON public.user_profiles_private
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can view all private data
CREATE POLICY "Admins can view all private data"
ON public.user_profiles_private
FOR SELECT
USING (is_admin(auth.uid()));

-- Migrate existing sensitive data to private table
INSERT INTO public.user_profiles_private (
  user_id,
  date_of_birth,
  notification_preferences,
  is_suspended,
  last_login_date,
  last_seen_at
)
SELECT 
  user_id,
  date_of_birth,
  notification_preferences,
  is_suspended,
  last_login_date,
  last_seen_at
FROM public.user_profiles;

-- Remove sensitive columns from public user_profiles table
ALTER TABLE public.user_profiles 
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS notification_preferences,
  DROP COLUMN IF EXISTS is_suspended,
  DROP COLUMN IF EXISTS last_login_date,
  DROP COLUMN IF EXISTS last_seen_at;

-- Update the RLS policy description on user_profiles to be more accurate
DROP POLICY IF EXISTS "Users can view all profiles but sensitive data is restricted" ON public.user_profiles;

CREATE POLICY "All users can view public profile data"
ON public.user_profiles
FOR SELECT
USING (true);

-- Add trigger to update updated_at on private profiles
CREATE TRIGGER update_user_profiles_private_updated_at
BEFORE UPDATE ON public.user_profiles_private
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();