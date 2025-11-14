-- Add challenge_id column to posts table
ALTER TABLE posts ADD COLUMN challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_posts_challenge_id ON posts(challenge_id);