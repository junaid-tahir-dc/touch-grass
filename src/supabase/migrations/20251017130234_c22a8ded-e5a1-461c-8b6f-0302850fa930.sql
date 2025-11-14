-- Fix all users' total_xp to match actual points_awarded from completed sessions
UPDATE user_profiles up
SET total_xp = COALESCE(
  (
    SELECT SUM(points_awarded)
    FROM user_challenge_sessions ucs
    WHERE ucs.user_id = up.user_id
      AND ucs.completed_at IS NOT NULL
  ),
  0
);