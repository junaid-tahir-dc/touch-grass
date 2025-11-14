-- Add date_of_birth column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN date_of_birth date NULL;