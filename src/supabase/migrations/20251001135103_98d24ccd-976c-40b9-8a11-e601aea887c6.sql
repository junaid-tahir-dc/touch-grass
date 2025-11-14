
-- Drop the old function
DROP FUNCTION IF EXISTS public.update_user_challenge_completion() CASCADE;

-- Create updated function that only updates XP and last_challenge_date, not the streak
CREATE OR REPLACE FUNCTION public.update_user_challenge_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenge_points integer;
  challenge_repeatable boolean;
  last_completion_time timestamp with time zone;
  previous_completions_count integer;
  can_award_points boolean := true;
BEGIN
  -- Only process when a session is being completed (completed_at is being set)
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    -- Get challenge points and repeatability
    SELECT points, is_repeatable INTO challenge_points, challenge_repeatable
    FROM public.challenges
    WHERE id = NEW.challenge_id;
    
    -- Count previous completions of this challenge by this user
    SELECT COUNT(*) INTO previous_completions_count
    FROM public.user_challenge_sessions
    WHERE user_id = NEW.user_id 
      AND challenge_id = NEW.challenge_id
      AND id != NEW.id
      AND completed_at IS NOT NULL;
    
    -- Handle non-repeatable challenges: only award points on first completion
    IF NOT challenge_repeatable THEN
      IF previous_completions_count > 0 THEN
        can_award_points := false;
      END IF;
    ELSE
      -- For repeatable challenges, check if 24 hours have passed since last completion
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
      -- Update user profile with new XP and last challenge date
      -- DO NOT update current_streak - that's only for login streaks
      UPDATE public.user_profiles
      SET 
        total_xp = total_xp + COALESCE(challenge_points, 10),
        last_challenge_date = CURRENT_DATE
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_challenge_completed ON public.user_challenge_sessions;
CREATE TRIGGER on_challenge_completed
  AFTER UPDATE ON public.user_challenge_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_challenge_completion();
