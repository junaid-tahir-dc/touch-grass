-- Add tasks field to challenges table for structured step-by-step instructions
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS tasks text;