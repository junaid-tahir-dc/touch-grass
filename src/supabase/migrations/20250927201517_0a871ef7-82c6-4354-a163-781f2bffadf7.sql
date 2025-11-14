-- Temporarily allow standalone demo profiles by making user_id nullable for demo users
-- First, let's create some demo profiles without foreign key constraints
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Insert demo users for testing chat functionality  
INSERT INTO public.user_profiles (user_id, username, display_name, avatar_url, is_online, bio) VALUES
('00000000-0000-0000-0000-000000000001', 'alex_walker', 'Alex Walker', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', true, 'Love hiking and photography 📸'),
('00000000-0000-0000-0000-000000000002', 'sam_chen', 'Sam Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', false, 'Coffee enthusiast ☕ | Book lover'),
('00000000-0000-0000-0000-000000000003', 'riley_jones', 'Riley Jones', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', true, 'Outdoor adventures and mindfulness 🧘'),
('00000000-0000-0000-0000-000000000004', 'jordan_taylor', 'Jordan Taylor', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', false, 'Fitness coach | Helping others reach their goals 💪'),
('00000000-0000-0000-0000-000000000005', 'casey_martinez', 'Casey Martinez', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', true, 'Art student | Digital design enthusiast 🎨'),
('00000000-0000-0000-0000-000000000006', 'morgan_davis', 'Morgan Davis', 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face', true, 'Travel blogger ✈️ | Always planning the next adventure')
ON CONFLICT (user_id) DO NOTHING;

-- Re-add the foreign key constraint but only for real users (not demo users)
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE 
NOT VALID;