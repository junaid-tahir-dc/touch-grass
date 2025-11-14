-- Function to add participants to a chat as creator/admin
CREATE OR REPLACE FUNCTION public.add_chat_participants(p_chat_id uuid, p_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  is_authorized boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = p_chat_id AND c.created_by = uid
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = p_chat_id AND cp.user_id = uid AND cp.role = 'admin'
    )
  ) INTO is_authorized;

  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Not authorized to add participants';
  END IF;

  INSERT INTO public.chat_participants (chat_id, user_id, role, is_subscribed)
  SELECT p_chat_id, unnest(p_user_ids), 'member', true
  ON CONFLICT (chat_id, user_id) DO NOTHING;
END;
$$;