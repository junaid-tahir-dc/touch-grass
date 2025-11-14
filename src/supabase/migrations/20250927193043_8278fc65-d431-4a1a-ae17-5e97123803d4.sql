-- Fix security warnings by setting search_path for all functions
CREATE OR REPLACE FUNCTION public.create_challenge_chat(challenge_id_param UUID, chat_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    chat_id UUID;
BEGIN
    -- Check if chat already exists for this challenge
    SELECT id INTO chat_id
    FROM public.chats
    WHERE challenge_id = challenge_id_param AND type = 'challenge';
    
    -- If not exists, create it
    IF chat_id IS NULL THEN
        INSERT INTO public.chats (type, name, challenge_id, created_by)
        VALUES ('challenge', chat_name, challenge_id_param, auth.uid())
        RETURNING id INTO chat_id;
    END IF;
    
    RETURN chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.subscribe_to_challenge_chat(challenge_id_param UUID, chat_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    chat_id UUID;
BEGIN
    -- Create or get existing challenge chat
    SELECT public.create_challenge_chat(challenge_id_param, chat_name) INTO chat_id;
    
    -- Subscribe user to the chat (ignore if already subscribed)
    INSERT INTO public.chat_participants (chat_id, user_id, is_subscribed)
    VALUES (chat_id, auth.uid(), true)
    ON CONFLICT (chat_id, user_id) 
    DO UPDATE SET is_subscribed = true;
    
    RETURN chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;