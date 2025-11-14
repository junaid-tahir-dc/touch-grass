-- Create chats table
CREATE TABLE public.chats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'challenge')),
    name TEXT,
    description TEXT,
    challenge_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    is_subscribed BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    reply_to UUID REFERENCES public.messages(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_edited BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Create user_profiles table for chat display info
CREATE TABLE public.user_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_online BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in" ON public.chats
FOR SELECT USING (
    id IN (
        SELECT chat_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat creators can update their chats" ON public.chats
FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their chats" ON public.chat_participants
FOR SELECT USING (
    chat_id IN (
        SELECT chat_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can join chats" ON public.chat_participants
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON public.chat_participants
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave chats" ON public.chat_participants
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages
FOR SELECT USING (
    chat_id IN (
        SELECT chat_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages to their chats" ON public.messages
FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    chat_id IN (
        SELECT chat_id FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.user_profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to create challenge chat
CREATE OR REPLACE FUNCTION public.create_challenge_chat(challenge_id_param UUID, chat_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to subscribe to challenge chat
CREATE OR REPLACE FUNCTION public.subscribe_to_challenge_chat(challenge_id_param UUID, chat_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();