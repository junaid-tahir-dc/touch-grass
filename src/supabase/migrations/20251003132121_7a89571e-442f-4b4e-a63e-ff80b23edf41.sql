
-- Fix the trigger to award points on first completion even if anonymous
-- Only repeated attempts should be blocked from earning points

CREATE OR REPLACE FUNCTION public.update_user_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      
      IF last_completion_time IS NOT NULL AND 
         (NEW.completed_at - last_completion_time) < INTERVAL '24 hours' THEN
        can_award_points := false;
      END IF;
    END IF;

    -- Award points only if eligible (first time for non-repeatable, or 24h+ for repeatable)
    IF can_award_points THEN
      UPDATE public.user_profiles
      SET 
        total_xp = total_xp + COALESCE(challenge_points, 10),
        last_challenge_date = CURRENT_DATE
      WHERE user_id = NEW.user_id;

      NEW.points_awarded := COALESCE(challenge_points, 10);
    ELSE
      NEW.points_awarded := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recalculate points for toottoot's session since it was their first completion
UPDATE user_challenge_sessions
SET points_awarded = (SELECT points FROM challenges WHERE id = user_challenge_sessions.challenge_id)
WHERE user_id = (SELECT user_id FROM user_profiles WHERE username = 'toottoot')
  AND completed_at IS NOT NULL
  AND challenge_id NOT IN (
    SELECT challenge_id 
    FROM user_challenge_sessions ucs2
    WHERE ucs2.user_id = user_challenge_sessions.user_id
      AND ucs2.challenge_id = user_challenge_sessions.challenge_id
      AND ucs2.completed_at < user_challenge_sessions.completed_at
      AND ucs2.completed_at IS NOT NULL
  );

-- Update toottoot's total XP
UPDATE user_profiles
SET total_xp = (
  SELECT COALESCE(SUM(points_awarded), 0)
  FROM user_challenge_sessions
  WHERE user_id = user_profiles.user_id
)
WHERE username = 'toottoot';
