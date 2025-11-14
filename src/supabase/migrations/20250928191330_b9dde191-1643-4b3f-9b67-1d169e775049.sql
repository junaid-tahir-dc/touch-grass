-- Add notification preferences to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "chat_messages": true,
  "challenge_updates": true,
  "browser_notifications": true
}'::jsonb;