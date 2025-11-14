-- Fix direct chat creation: correct FK on chat_participants.user_id to reference user_profiles(user_id)
-- and ensure referential integrity for existing rows

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'chat_participants_user_id_fkey'
      AND tc.table_name = 'chat_participants'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.chat_participants
      DROP CONSTRAINT chat_participants_user_id_fkey;
  END IF;
END $$;

-- Ensure user_profiles.user_id is unique so it can be referenced by FK
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_unique_idx
  ON public.user_profiles (user_id);

-- Backfill any missing profiles for existing participants to satisfy FK
INSERT INTO public.user_profiles (user_id, username, display_name)
SELECT DISTINCT cp.user_id,
       'user_' || left(cp.user_id::text, 8),
       'User ' || left(cp.user_id::text, 8)
FROM public.chat_participants cp
LEFT JOIN public.user_profiles up
  ON up.user_id = cp.user_id
WHERE up.user_id IS NULL;

-- Recreate proper FK to user_profiles(user_id)
ALTER TABLE public.chat_participants
  ADD CONSTRAINT chat_participants_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.user_profiles (user_id)
  ON DELETE CASCADE;
