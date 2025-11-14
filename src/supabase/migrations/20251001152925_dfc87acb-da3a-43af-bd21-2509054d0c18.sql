-- Create function to handle challenge post deletion
CREATE OR REPLACE FUNCTION public.handle_challenge_post_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  challenge_points integer;
  deleted_session_id uuid;
BEGIN
  -- Only process if the post has a challenge_id
  IF OLD.challenge_id IS NOT NULL THEN
    -- Get challenge points
    SELECT points INTO challenge_points
    FROM public.challenges
    WHERE id = OLD.challenge_id;
    
    -- Find the most recent completed session for this user/challenge
    SELECT id INTO deleted_session_id
    FROM public.user_challenge_sessions
    WHERE user_id = OLD.user_id
      AND challenge_id = OLD.challenge_id
      AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 1;
    
    -- If a completed session exists, reverse the completion
    IF deleted_session_id IS NOT NULL THEN
      -- Deduct points from user profile
      UPDATE public.user_profiles
      SET total_xp = GREATEST(0, total_xp - COALESCE(challenge_points, 10))
      WHERE user_id = OLD.user_id;
      
      -- Delete the session record
      DELETE FROM public.user_challenge_sessions
      WHERE id = deleted_session_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger to fire before post deletion
CREATE TRIGGER trg_handle_challenge_post_deletion
  BEFORE DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_post_deletion();