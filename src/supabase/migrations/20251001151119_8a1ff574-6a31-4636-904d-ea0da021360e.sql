-- 1) Drop the restrictive unique constraint first to allow data cleanup
ALTER TABLE public.user_challenge_sessions
DROP CONSTRAINT IF EXISTS user_challenge_sessions_user_id_challenge_id_is_active_key;

-- 2) Clean up any sessions incorrectly marked active when completed_at is set
UPDATE public.user_challenge_sessions
SET is_active = false
WHERE completed_at IS NOT NULL AND is_active = true;

-- 3) Create a partial unique index so only one ACTIVE session per (user, challenge) is allowed
DROP INDEX IF EXISTS ux_active_session_per_challenge;
CREATE UNIQUE INDEX ux_active_session_per_challenge
ON public.user_challenge_sessions (user_id, challenge_id)
WHERE is_active = true;

-- 4) Enforce that setting completed_at automatically deactivates the session
CREATE OR REPLACE FUNCTION public.enforce_session_state()
RETURNS trigger AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_session_state ON public.user_challenge_sessions;
CREATE TRIGGER trg_enforce_session_state
BEFORE INSERT OR UPDATE ON public.user_challenge_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_session_state();