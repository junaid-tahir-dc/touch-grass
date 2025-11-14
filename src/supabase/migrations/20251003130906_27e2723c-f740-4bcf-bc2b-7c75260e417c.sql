-- Add flags and tracking for anonymous completions and awarded points
-- 1) Schema changes
ALTER TABLE public.user_challenge_sessions
  ADD COLUMN IF NOT EXISTS posted_anonymously boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_awarded integer NOT NULL DEFAULT 0;

-- 2) Update completion trigger function to respect anonymous posts and record awarded points
CREATE OR REPLACE FUNCTION public.update_user_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

    -- Block awarding if the completion was posted anonymously
    IF NEW.posted_anonymously THEN
      can_award_points := false;
    END IF;

    -- Count previous completions of this challenge by this user
    SELECT COUNT(*) INTO previous_completions_count
    FROM public.user_challenge_sessions
    WHERE user_id = NEW.user_id 
      AND challenge_id = NEW.challenge_id
      AND id != NEW.id
      AND completed_at IS NOT NULL;

    -- Handle non-repeatable challenges: only award points on first completion
    IF can_award_points THEN
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
    END IF;

    -- Award points only if eligible
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
$$;

-- 3) Update post deletion handler to deduct based on points_awarded only
CREATE OR REPLACE FUNCTION public.handle_challenge_post_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  challenge_points integer;
  deleted_session_id uuid;
  awarded integer;
BEGIN
  -- Only process if the post has a challenge_id
  IF OLD.challenge_id IS NOT NULL THEN
    -- Find the most recent completed session for this user/challenge
    SELECT id, points_awarded INTO deleted_session_id, awarded
    FROM public.user_challenge_sessions
    WHERE user_id = OLD.user_id
      AND challenge_id = OLD.challenge_id
      AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 1;

    -- If a completed session exists, reverse the completion
    IF deleted_session_id IS NOT NULL THEN
      -- Deduct points only if they were actually awarded
      IF COALESCE(awarded, 0) > 0 THEN
        UPDATE public.user_profiles
        SET total_xp = GREATEST(0, total_xp - awarded)
        WHERE user_id = OLD.user_id;
      END IF;

      -- Delete the session record
      DELETE FROM public.user_challenge_sessions
      WHERE id = deleted_session_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;