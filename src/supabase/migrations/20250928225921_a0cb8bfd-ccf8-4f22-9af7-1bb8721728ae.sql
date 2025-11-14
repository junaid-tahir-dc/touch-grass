-- Add show_on_leaderboard column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN show_on_leaderboard boolean NOT NULL DEFAULT false;

-- Update existing profiles to use the leaderboard setting from localStorage
-- This is a one-time migration to preserve existing user preferences
COMMENT ON COLUMN public.user_profiles.show_on_leaderboard IS 'Whether the user has opted to be visible on the leaderboard';