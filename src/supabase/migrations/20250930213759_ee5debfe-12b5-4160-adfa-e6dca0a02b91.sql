-- Add media support to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text;

-- Add storage policies for comment images in post-media bucket
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload comment images" ON storage.objects;
DROP POLICY IF EXISTS "Comment images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their comment images" ON storage.objects;

-- Create new policies for comment images
CREATE POLICY "Users can upload comment images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'comments'
);

CREATE POLICY "Comment images are publicly accessible"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[2] = 'comments'
);

CREATE POLICY "Users can delete their comment images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'comments'
);