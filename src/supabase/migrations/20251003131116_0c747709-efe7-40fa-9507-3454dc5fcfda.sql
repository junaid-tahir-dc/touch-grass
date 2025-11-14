-- Recalculate points for existing users based on new anonymous rules

-- Step 1: Mark sessions as posted_anonymously if they have a corresponding anonymous post
UPDATE public.user_challenge_sessions AS ucs
SET posted_anonymously = true
FROM public.posts AS p
WHERE ucs.challenge_id = p.challenge_id
  AND ucs.user_id = p.user_id
  AND p.is_anonymous = true
  AND ucs.completed_at IS NOT NULL
  AND ucs.completed_at <= p.created_at + INTERVAL '5 minutes'  -- Match sessions to posts within 5 min
  AND ucs.completed_at >= p.created_at - INTERVAL '5 minutes';

-- Step 2: Recalculate points_awarded for all completed sessions
DO $$
DECLARE
  session_record RECORD;
  challenge_points integer;
  challenge_repeatable boolean;
  previous_completions_count integer;
  last_completion_time timestamp with time zone;
  can_award_points boolean;
  awarded_points integer;
BEGIN
  -- Loop through all completed sessions in chronological order
  FOR session_record IN 
    SELECT * FROM public.user_challenge_sessions 
    WHERE completed_at IS NOT NULL 
    ORDER BY user_id, challenge_id, completed_at ASC
  LOOP
    can_award_points := true;
    
    -- Get challenge details
    SELECT points, is_repeatable INTO challenge_points, challenge_repeatable
    FROM public.challenges
    WHERE id = session_record.challenge_id;
    
    -- Check if posted anonymously
    IF session_record.posted_anonymously THEN
      can_award_points := false;
    END IF;
    
    -- Count previous completions by this user for this challenge
    SELECT COUNT(*) INTO previous_completions_count
    FROM public.user_challenge_sessions
    WHERE user_id = session_record.user_id 
      AND challenge_id = session_record.challenge_id
      AND completed_at IS NOT NULL
      AND completed_at < session_record.completed_at;
    
    IF can_award_points THEN
      -- Handle non-repeatable challenges
      IF NOT challenge_repeatable THEN
        IF previous_completions_count > 0 THEN
          can_award_points := false;
        END IF;
      ELSE
        -- For repeatable challenges, check 24-hour cooldown
        SELECT MAX(completed_at) INTO last_completion_time
        FROM public.user_challenge_sessions
        WHERE user_id = session_record.user_id 
          AND challenge_id = session_record.challenge_id
          AND completed_at IS NOT NULL
          AND completed_at < session_record.completed_at;
        
        IF last_completion_time IS NOT NULL AND 
           (session_record.completed_at - last_completion_time) < INTERVAL '24 hours' THEN
          can_award_points := false;
        END IF;
      END IF;
    END IF;
    
    -- Calculate awarded points
    IF can_award_points THEN
      awarded_points := COALESCE(challenge_points, 10);
    ELSE
      awarded_points := 0;
    END IF;
    
    -- Update the session record
    UPDATE public.user_challenge_sessions
    SET points_awarded = awarded_points
    WHERE id = session_record.id;
  END LOOP;
END $$;

-- Step 3: Recalculate total_xp for all users
UPDATE public.user_profiles AS up
SET total_xp = COALESCE((
  SELECT SUM(points_awarded)
  FROM public.user_challenge_sessions
  WHERE user_id = up.user_id
    AND completed_at IS NOT NULL
), 0);