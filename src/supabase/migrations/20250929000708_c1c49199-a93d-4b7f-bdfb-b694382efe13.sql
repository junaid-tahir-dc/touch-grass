-- Add media requirement column to challenges table
ALTER TABLE public.challenges 
ADD COLUMN media_requirement text DEFAULT 'none' CHECK (media_requirement IN ('none', 'photo', 'video'));