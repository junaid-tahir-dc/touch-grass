-- Create function to create or get a direct chat between two users
create or replace function public.create_or_get_direct_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  chat_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id = current_user_id then
    raise exception 'Cannot start a chat with yourself';
  end if;

  -- Try to find existing direct chat with both participants
  select c.id into chat_id
  from public.chats c
  join public.chat_participants p1 on p1.chat_id = c.id and p1.user_id = current_user_id
  join public.chat_participants p2 on p2.chat_id = c.id and p2.user_id = other_user_id
  where c.type = 'direct'
  limit 1;

  if chat_id is not null then
    return chat_id;
  end if;

  -- Create new direct chat
  insert into public.chats (type, created_by)
  values ('direct', current_user_id)
  returning id into chat_id;

  -- Add both participants
  insert into public.chat_participants (chat_id, user_id)
  values (chat_id, current_user_id),
         (chat_id, other_user_id)
  on conflict do nothing;

  return chat_id;
end;
$$;