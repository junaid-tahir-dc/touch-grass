-- Create a function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Create trigger to automatically create profile for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create profiles for existing users (if any)
insert into public.user_profiles (user_id, username, display_name)
select 
  id,
  coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1)) as username,
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) as display_name
from auth.users au
where not exists (
  select 1 from public.user_profiles up where up.user_id = au.id
)
on conflict (user_id) do nothing;