-- Update the handle_new_user trigger to create entries in both tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  -- Get base username from metadata or email
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  
  -- Remove any special characters and ensure lowercase
  base_username := lower(regexp_replace(base_username, '[^a-z0-9_]', '', 'g'));
  
  -- Ensure username is at least 3 characters
  IF length(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  
  final_username := base_username;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  
  -- Insert user profile with unique username (public data)
  INSERT INTO public.user_profiles (user_id, username, display_name, onboarding_completed)
  VALUES (
    new.id,
    final_username,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false
  );
  
  -- Insert private profile data with defaults
  INSERT INTO public.user_profiles_private (
    user_id,
    date_of_birth,
    notification_preferences,
    is_suspended,
    last_login_date,
    last_seen_at
  )
  VALUES (
    new.id,
    NULL,
    jsonb_build_object(
      'email_notifications', true,
      'push_notifications', true,
      'challenge_reminders', true,
      'social_updates', true
    ),
    false,
    now(),
    now()
  );
  
  RETURN new;
END;
$function$;