-- Clean up demo/seed users that were inserted without proper authentication
-- These users have placeholder UUIDs and no email addresses

DELETE FROM user_profiles 
WHERE user_id IN (
  SELECT up.user_id 
  FROM user_profiles up
  LEFT JOIN auth.users u ON u.id = up.user_id
  WHERE u.id IS NULL
);

-- This removes any profiles that don't have a corresponding auth user