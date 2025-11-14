-- Add sample interests to your profile
UPDATE user_profiles 
SET interests = ARRAY['Mindfulness', 'Photography', 'Hiking', 'Community Service', 'Reading'] 
WHERE user_id = 'cdad0dea-011f-4016-8305-280fb1b69831';