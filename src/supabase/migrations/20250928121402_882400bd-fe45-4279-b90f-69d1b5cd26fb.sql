-- Update SELECT policy to allow creators to see their chats immediately
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;

CREATE POLICY "Users can view chats they participate in or created" 
ON public.chats
FOR SELECT
TO authenticated
USING (
  user_in_chat(auth.uid(), id) OR auth.uid() = created_by
);