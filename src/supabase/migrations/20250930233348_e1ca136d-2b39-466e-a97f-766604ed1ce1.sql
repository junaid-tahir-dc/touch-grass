-- Update the trigger function to handle non-repeatable challenges correctly
-- Non-repeatable challenges can be completed multiple times but only award points once
-- Repeatable challenges award points each time (with 24-hour cooldown)

CREATE OR REPLACE FUNCTION public.update_user_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  challenge_points integer;
  challenge_repeatable boolean;
  user_last_challenge_date date;
  new_streak integer;
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
$function$;