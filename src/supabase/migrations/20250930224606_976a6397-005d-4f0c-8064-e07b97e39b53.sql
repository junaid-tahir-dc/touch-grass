-- Add is_anonymous column to posts table
ALTER TABLE public.posts 
ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;