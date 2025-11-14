-- Fix the ambiguous chat_id reference in subscribe_to_challenge_chat function
CREATE OR REPLACE FUNCTION public.subscribe_to_challenge_chat(challenge_id_param uuid, chat_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_chat_id UUID;
BEGIN
    -- Create or get existing challenge chat
    SELECT public.create_challenge_chat(challenge_id_param, chat_name) INTO target_chat_id;
    
    -- Subscribe user to the chat (ignore if already subscribed)
    INSERT INTO public.chat_participants (chat_id, user_id, is_subscribed)
    VALUES (target_chat_id, auth.uid(), true)
    ON CONFLICT (chat_id, user_id) 
    DO UPDATE SET is_subscribed = true;
    
    RETURN target_chat_id;
END;
$function$;