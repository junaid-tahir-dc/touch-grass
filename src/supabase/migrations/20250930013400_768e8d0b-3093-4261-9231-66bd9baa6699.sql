-- Add last_seen_at column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN last_seen_at timestamp with time zone DEFAULT now();

-- Create an index for efficient online status queries
CREATE INDEX idx_user_profiles_last_seen_at ON public.user_profiles(last_seen_at);

-- Update existing users to have a last_seen_at value
UPDATE public.user_profiles 
SET last_seen_at = updated_at 
WHERE last_seen_at IS NULL;