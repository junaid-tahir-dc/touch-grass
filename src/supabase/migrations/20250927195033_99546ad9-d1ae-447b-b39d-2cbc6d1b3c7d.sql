-- Add missing relationships so PostgREST can embed resources

-- 1) chat_participants.chat_id -> chats.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_participants_chat_id_fkey_chats_id'
  ) THEN
    ALTER TABLE public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_fkey_chats_id
    FOREIGN KEY (chat_id)
    REFERENCES public.chats(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 2) messages.chat_id -> chats.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_chat_id_fkey_chats_id'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_chat_id_fkey_chats_id
    FOREIGN KEY (chat_id)
    REFERENCES public.chats(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 3) messages.user_id -> user_profiles.user_id (requires unique on user_profiles.user_id which we added earlier)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_user_id_fkey_profiles_user_id'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_user_id_fkey_profiles_user_id
    FOREIGN KEY (user_id)
    REFERENCES public.user_profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Optional: self reference for reply_to -> messages.id for data integrity (not required by current UI but good to have)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_reply_to_fkey_messages_id'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_reply_to_fkey_messages_id
    FOREIGN KEY (reply_to)
    REFERENCES public.messages(id)
    ON DELETE SET NULL;
  END IF;
END $$;