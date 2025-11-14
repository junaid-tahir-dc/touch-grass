-- Add admin role to existing user (replace with actual user ID when needed)
-- This is a placeholder - will need actual user ID
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Create some sample content for testing
INSERT INTO public.content (title, content_type, content, summary, thumbnail_url, tags)
VALUES 
  ('Getting Started with Mindfulness', 'article', 'Mindfulness is the practice of being fully present and engaged in the current moment...', 'Learn the basics of mindfulness practice and how to incorporate it into your daily routine.', null, ARRAY['mindfulness', 'wellness', 'beginner']),
  ('5-Minute Morning Meditation', 'video', null, 'A quick guided meditation to start your day with focus and clarity.', null, ARRAY['meditation', 'morning routine', 'video']),
  ('The Science of Gratitude', 'article', 'Research shows that practicing gratitude can significantly improve mental health...', 'Discover the scientific benefits of gratitude and practical ways to cultivate thankfulness.', null, ARRAY['gratitude', 'science', 'mental health'])
ON CONFLICT (id) DO NOTHING;