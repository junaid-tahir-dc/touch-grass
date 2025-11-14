-- Drop the existing INSERT policy for chats
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

-- Create a new, more robust INSERT policy
CREATE POLICY "Authenticated users can create chats" 
ON public.chats 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = created_by
);

-- Also ensure the UPDATE policy is correct
DROP POLICY IF EXISTS "Chat creators can update their chats" ON public.chats;

CREATE POLICY "Chat creators can update their chats" 
ON public.chats 
FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);