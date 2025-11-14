-- Add interests field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN interests TEXT[];

-- Add an index for better performance when searching by interests
CREATE INDEX idx_user_profiles_interests ON public.user_profiles USING GIN(interests);