-- Fix update_login_streak to use private table for last_login_date
CREATE OR REPLACE FUNCTION public.update_login_streak()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_login date;
  days_since_last_login integer;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  -- Ensure private profile exists
  INSERT INTO public.user_profiles_private (user_id, last_login_date)
  VALUES (uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get last login date from private table
  SELECT upp.last_login_date INTO last_login
  FROM public.user_profiles_private upp
  WHERE upp.user_id = uid;

  -- If already logged in today, exit
  IF last_login = CURRENT_DATE THEN
    RETURN;
  END IF;

  IF last_login IS NULL THEN
    -- First time login: set streak to 1
    UPDATE public.user_profiles
    SET current_streak = 1
    WHERE user_id = uid;

    UPDATE public.user_profiles_private
    SET last_login_date = CURRENT_DATE
    WHERE user_id = uid;
  ELSE
    days_since_last_login := CURRENT_DATE - last_login;

    IF days_since_last_login = 1 THEN
      -- Consecutive day, increment streak
      UPDATE public.user_profiles
      SET current_streak = current_streak + 1
      WHERE user_id = uid;
    ELSIF days_since_last_login > 1 THEN
      -- Streak broken, reset to 1
      UPDATE public.user_profiles
      SET current_streak = 1
      WHERE user_id = uid;
    END IF;

    -- Update last_login_date to today
    UPDATE public.user_profiles_private
    SET last_login_date = CURRENT_DATE
    WHERE user_id = uid;
  END IF;
END;
$function$;