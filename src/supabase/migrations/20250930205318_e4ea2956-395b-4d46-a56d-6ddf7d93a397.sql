-- Add last_login_date column to track daily logins
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_login_date date;

-- Create or replace function to update login streak
CREATE OR REPLACE FUNCTION public.update_login_streak()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  days_since_last_login integer;
BEGIN
  -- Get current user
  SELECT * INTO user_record
  FROM public.user_profiles
  WHERE user_id = auth.uid();

  IF user_record IS NULL THEN
    RETURN;
  END IF;

  -- Check if user already logged in today
  IF user_record.last_login_date = CURRENT_DATE THEN
    -- Already logged in today, no update needed
    RETURN;
  END IF;

  -- Calculate days since last login
  IF user_record.last_login_date IS NULL THEN
    -- First time login
    UPDATE public.user_profiles
    SET 
      current_streak = 1,
      last_login_date = CURRENT_DATE
    WHERE user_id = auth.uid();
  ELSE
    days_since_last_login := CURRENT_DATE - user_record.last_login_date;
    
    IF days_since_last_login = 1 THEN
      -- Consecutive day, increment streak
      UPDATE public.user_profiles
      SET 
        current_streak = current_streak + 1,
        last_login_date = CURRENT_DATE
      WHERE user_id = auth.uid();
    ELSIF days_since_last_login > 1 THEN
      -- Streak broken, reset to 1
      UPDATE public.user_profiles
      SET 
        current_streak = 1,
        last_login_date = CURRENT_DATE
      WHERE user_id = auth.uid();
    END IF;
  END IF;
END;
$$;