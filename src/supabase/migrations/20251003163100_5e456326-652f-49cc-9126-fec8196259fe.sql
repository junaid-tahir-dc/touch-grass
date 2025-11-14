-- Add suspension capability to user profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Add index for faster queries on suspended users
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_suspended 
ON public.user_profiles(is_suspended);

COMMENT ON COLUMN public.user_profiles.is_suspended IS 'Indicates if the user account has been suspended by an admin';