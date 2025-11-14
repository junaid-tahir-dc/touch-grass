-- Add onboarding_completed column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Update the handle_new_user trigger function to set onboarding_completed to false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, display_name, onboarding_completed)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false
  );
  RETURN new;
END;
$$;