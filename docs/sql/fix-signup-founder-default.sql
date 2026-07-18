begin;

alter table public.studios
alter column plan_type set default 'founder';

alter table public.studios
alter column subscription_status set default 'trialing';

update public.studios
set plan_type = 'founder'
where plan_type is null
   or trim(plan_type) = ''
   or plan_type in ('starter', 'premium');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_studio_id uuid;
begin
  if coalesce(new.raw_user_meta_data->>'is_owner', 'false') = 'true' then
    insert into public.studios (
      name,
      business_type,
      subscription_status,
      plan_type
    )
    values (
      'Mio Spazio di Lavoro',
      coalesce(nullif(new.raw_user_meta_data->>'business_type', ''), 'studio'),
      'trialing',
      'founder'
    )
    returning id into new_studio_id;

    insert into public.profiles (
      id,
      email,
      full_name,
      role,
      is_owner,
      studio_id
    )
    values (
      new.id,
      new.email,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email),
      'admin',
      true,
      new_studio_id
    );
  else
    insert into public.profiles (
      id,
      email,
      full_name,
      role,
      is_owner,
      studio_id
    )
    values (
      new.id,
      new.email,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email),
      coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'staff'),
      false,
      nullif(new.raw_user_meta_data->>'studio_id', '')::uuid
    );
  end if;

  return new;
end;
$$;

commit;
