-- Create a SECURITY DEFINER helper to avoid recursive RLS
create or replace function public.user_in_chat(_user_id uuid, _chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_participants cp
    where cp.user_id = _user_id
      and cp.chat_id = _chat_id
  );
$$;

-- Replace recursive SELECT policy on chat_participants
drop policy if exists "Users can view participants in their chats" on public.chat_participants;
create policy "Users can view participants in their chats"
  on public.chat_participants
  for select
  using (public.user_in_chat(auth.uid(), chat_id));

-- Update chats SELECT policy to use helper (avoids subqueries that depend on chat_participants RLS)
drop policy if exists "Users can view chats they participate in" on public.chats;
create policy "Users can view chats they participate in"
  on public.chats
  for select
  using (public.user_in_chat(auth.uid(), id));

-- Update messages policies to use helper
-- SELECT
drop policy if exists "Users can view messages in their chats" on public.messages;
create policy "Users can view messages in their chats"
  on public.messages
  for select
  using (public.user_in_chat(auth.uid(), chat_id));

-- INSERT
drop policy if exists "Users can send messages to their chats" on public.messages;
create policy "Users can send messages to their chats"
  on public.messages
  for insert
  with check ((auth.uid() = user_id) and public.user_in_chat(auth.uid(), chat_id));