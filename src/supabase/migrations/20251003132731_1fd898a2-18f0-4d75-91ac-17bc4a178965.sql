-- Attach triggers so points are awarded when a session is completed
-- and backfill all existing sessions to ensure consistency

-- 1) Ensure triggers exist on user_challenge_sessions
DROP TRIGGER IF EXISTS user_challenge_sessions_award_points ON public.user_challenge_sessions;
CREATE TRIGGER user_challenge_sessions_award_points
BEFORE UPDATE OF completed_at ON public.user_challenge_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_challenge_completion();

DROP TRIGGER IF EXISTS user_challenge_sessions_enforce_state ON public.user_challenge_sessions;
CREATE TRIGGER user_challenge_sessions_enforce_state
BEFORE UPDATE OF completed_at ON public.user_challenge_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_session_state();

-- 2) Backfill points_awarded for ALL existing completed sessions according to the latest rules
WITH ordered AS (
  SELECT 
    ucs.id,
    ucs.user_id,
    ucs.challenge_id,
    ucs.completed_at,
    c.points,
    c.is_repeatable,
    LAG(ucs.completed_at) OVER (
      PARTITION BY ucs.user_id, ucs.challenge_id 
      ORDER BY ucs.completed_at
    ) AS prev_completed_at,
    ROW_NUMBER() OVER (
      PARTITION BY ucs.user_id, ucs.challenge_id 
      ORDER BY ucs.completed_at
    ) AS rn
  FROM public.user_challenge_sessions ucs
  JOIN public.challenges c ON c.id = ucs.challenge_id
  WHERE ucs.completed_at IS NOT NULL
)
UPDATE public.user_challenge_sessions u
SET points_awarded = CASE
  WHEN ordered.rn = 1 THEN COALESCE(ordered.points, 10)
  WHEN ordered.is_repeatable AND ordered.prev_completed_at IS NOT NULL AND (ordered.completed_at - ordered.prev_completed_at) >= INTERVAL '24 hours' THEN COALESCE(ordered.points, 10)
  ELSE 0
END
FROM ordered
WHERE u.id = ordered.id;

-- 3) Recompute user total_xp from sessions
UPDATE public.user_profiles up
SET total_xp = COALESCE(s.sum_points, 0)
FROM (
  SELECT user_id, SUM(points_awarded) AS sum_points
  FROM public.user_challenge_sessions
  WHERE completed_at IS NOT NULL
  GROUP BY user_id
) s
WHERE up.user_id = s.user_id;