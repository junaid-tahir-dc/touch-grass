-- Add XP tracking columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN total_xp integer NOT NULL DEFAULT 0,
ADD COLUMN current_streak integer NOT NULL DEFAULT 0,
ADD COLUMN last_challenge_date date;

-- Create function to calculate completed challenges count
CREATE OR REPLACE FUNCTION public.get_user_completed_challenges(user_id_param uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_challenge_sessions
  WHERE user_id = user_id_param 
  AND completed_at IS NOT NULL
$$;

-- Create function to update user XP and streak when completing a challenge
CREATE OR REPLACE FUNCTION public.update_user_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  challenge_points integer;
  user_last_challenge_date date;
  new_streak integer;
BEGIN
  -- Only process when a session is being completed (completed_at is being set)
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    -- Get challenge points
    SELECT points INTO challenge_points
    FROM public.challenges
    WHERE id = NEW.challenge_id;
    
    -- Get user's last challenge date and current streak
    SELECT last_challenge_date, current_streak 
    INTO user_last_challenge_date, new_streak
    FROM public.user_profiles
    WHERE user_id = NEW.user_id;
    
    -- Calculate new streak
    IF user_last_challenge_date IS NULL THEN
      -- First challenge
      new_streak := 1;
    ELSIF user_last_challenge_date = CURRENT_DATE - INTERVAL '1 day' THEN
      -- Consecutive day
      new_streak := COALESCE(new_streak, 0) + 1;
    ELSIF user_last_challenge_date = CURRENT_DATE THEN
      -- Same day, keep streak
      new_streak := COALESCE(new_streak, 0);
    ELSE
      -- Streak broken
      new_streak := 1;
    END IF;
    
    -- Update user profile with new XP and streak
    UPDATE public.user_profiles
    SET 
      total_xp = total_xp + COALESCE(challenge_points, 10),
      current_streak = new_streak,
      last_challenge_date = CURRENT_DATE
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for challenge completion
CREATE TRIGGER trigger_update_user_challenge_completion
  AFTER UPDATE ON public.user_challenge_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_challenge_completion();