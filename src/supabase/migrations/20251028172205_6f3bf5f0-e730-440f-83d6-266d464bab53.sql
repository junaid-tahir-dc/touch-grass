-- Add 'quick-wins' to the category check constraint for challenges table
-- First, we need to drop the existing constraint and recreate it with the new value

-- Drop the existing check constraint if it exists
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_category_check;

-- Add the new check constraint with 'quick-wins' included
ALTER TABLE public.challenges 
ADD CONSTRAINT challenges_category_check 
CHECK (category IN ('quick-wins', 'adulting', 'mindset', 'social', 'outdoors', 'local', 'creative', 'collab'));