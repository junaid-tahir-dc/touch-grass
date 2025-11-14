-- Ensure user_profiles.user_id is unique to be target of FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Ensure composite uniqueness for (chat_id, user_id) used by ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_participants_chat_id_user_id_key'
  ) THEN
    ALTER TABLE public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_user_id_key UNIQUE (chat_id, user_id);
  END IF;
END $$;

-- Add foreign key so PostgREST can infer relationship chat_participants -> user_profiles via user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_participants_user_id_fkey_profiles_user_id'
  ) THEN
    ALTER TABLE public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey_profiles_user_id
    FOREIGN KEY (user_id)
    REFERENCES public.user_profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;