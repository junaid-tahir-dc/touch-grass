-- Ensure awarding & state enforcement triggers exist on user_challenge_sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_challenge_completion'
  ) THEN
    CREATE TRIGGER trg_user_challenge_completion
    BEFORE UPDATE ON public.user_challenge_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_challenge_completion();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_challenge_enforce_state'
  ) THEN
    CREATE TRIGGER trg_user_challenge_enforce_state
    BEFORE UPDATE ON public.user_challenge_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_session_state();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_challenge_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_challenge_updated_at
    BEFORE UPDATE ON public.user_challenge_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Backfill: award points for completed sessions missing points
UPDATE public.user_challenge_sessions ucs
SET points_awarded = COALESCE(c.points, 10)
FROM public.challenges c
WHERE ucs.challenge_id = c.id
  AND ucs.completed_at IS NOT NULL
  AND COALESCE(ucs.points_awarded, 0) = 0;

-- Recalculate canonical XP on profiles from awarded points
UPDATE public.user_profiles up
SET total_xp = COALESCE(s.sum_points, 0)
FROM (
  SELECT user_id, SUM(points_awarded) AS sum_points
  FROM public.user_challenge_sessions
  WHERE completed_at IS NOT NULL
  GROUP BY user_id
) s
WHERE up.user_id = s.user_id;

-- Optional: set remaining users with no completions to 0
UPDATE public.user_profiles up
SET total_xp = 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_challenge_sessions ucs
  WHERE ucs.user_id = up.user_id AND ucs.completed_at IS NOT NULL
);
