-- Add is_repeatable field to challenges table
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS is_repeatable boolean DEFAULT false;

-- Update the trigger function to handle repeatable challenges with 24hr cooldown
CREATE OR REPLACE FUNCTION public.update_user_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  challenge_points integer;
  challenge_repeatable boolean;
  user_last_challenge_date date;
  new_streak integer;
  last_completion_time timestamp with time zone;
  can_award_points boolean := true;
BEGIN
  -- Only process when a session is being completed (completed_at is being set)
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    -- Get challenge points and repeatability
    SELECT points, is_repeatable INTO challenge_points, challenge_repeatable
    FROM public.challenges
    WHERE id = NEW.challenge_id;
    
    -- For repeatable challenges, check if 24 hours have passed since last completion
    IF challenge_repeatable THEN
      SELECT MAX(completed_at) INTO last_completion_time
      FROM public.user_challenge_sessions
      WHERE user_id = NEW.user_id 
        AND challenge_id = NEW.challenge_id
        AND id != NEW.id
        AND completed_at IS NOT NULL;
      
      -- Only award points if more than 24 hours have passed or this is the first completion
      IF last_completion_time IS NOT NULL AND 
         (NEW.completed_at - last_completion_time) < INTERVAL '24 hours' THEN
        can_award_points := false;
      END IF;
    END IF;
    
    -- Award points only if eligible
    IF can_award_points THEN
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
  END IF;
  
  RETURN NEW;
END;
$$;