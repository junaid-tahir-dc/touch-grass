
-- Fix: Recalculate all user points based on actual completed challenges
-- This handles non-repeatable challenges and proper point tallying

WITH ranked_completions AS (
  SELECT 
    ucs.user_id,
    ucs.challenge_id,
    c.points,
    c.is_repeatable,
    ucs.completed_at,
    ROW_NUMBER() OVER (
      PARTITION BY ucs.user_id, ucs.challenge_id 
      ORDER BY ucs.completed_at ASC
    ) as completion_rank,
    LAG(ucs.completed_at) OVER (
      PARTITION BY ucs.user_id, ucs.challenge_id 
      ORDER BY ucs.completed_at ASC
    ) as prev_completion_time
  FROM user_challenge_sessions ucs
  JOIN challenges c ON ucs.challenge_id = c.id
  WHERE ucs.completed_at IS NOT NULL
),
valid_completions AS (
  SELECT 
    user_id,
    challenge_id,
    points,
    completed_at
  FROM ranked_completions
  WHERE 
    -- For non-repeatable: only first completion
    (is_repeatable = false AND completion_rank = 1)
    OR
    -- For repeatable: first completion OR 24+ hours since last
    (is_repeatable = true AND (
      prev_completion_time IS NULL 
      OR (completed_at - prev_completion_time) >= INTERVAL '24 hours'
    ))
),
user_totals AS (
  SELECT 
    user_id,
    SUM(points) as calculated_xp
  FROM valid_completions
  GROUP BY user_id
)
UPDATE user_profiles up
SET total_xp = COALESCE(ut.calculated_xp, 0)
FROM (
  SELECT up2.user_id, COALESCE(ut.calculated_xp, 0) as calculated_xp
  FROM user_profiles up2
  LEFT JOIN user_totals ut ON up2.user_id = ut.user_id
) ut
WHERE up.user_id = ut.user_id;
