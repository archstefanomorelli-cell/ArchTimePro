-- Fix the authenticated entries endpoint after profiles were locked down.
-- The qualified profile columns avoid a conflict with RETURNS TABLE output names.

begin;

create or replace function public.get_entries_for_app()
returns table (
  id uuid,
  studio_id uuid,
  project_id uuid,
  project_name text,
  task text,
  duration numeric,
  user_email text,
  user_name text,
  rate numeric,
  notes text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_studio uuid;
  caller_email text;
  caller_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  caller_studio := public.get_my_studio_id();
  caller_is_admin := public.is_admin();

  if caller_studio is null then
    raise exception 'Utente senza studio';
  end if;

  select profile.email
  into caller_email
  from public.profiles as profile
  where profile.id = auth.uid();

  if caller_email is null then
    raise exception 'Profilo non valido';
  end if;

  return query
  select
    entry.id,
    entry.studio_id,
    entry.project_id,
    entry.project_name,
    entry.task,
    entry.duration::numeric,
    entry.user_email,
    entry.user_name,
    case when caller_is_admin then entry.rate::numeric else null::numeric end,
    entry.notes,
    entry.created_at
  from public.entries as entry
  where entry.studio_id = caller_studio
    and (caller_is_admin or entry.user_email = caller_email)
  order by entry.created_at desc
  limit 2000;
end;
$$;

revoke all on function public.get_entries_for_app() from public, anon;
grant execute on function public.get_entries_for_app() to authenticated;

-- Remove legacy policies that query profiles directly. After profiles are locked
-- down, those expressions fail before the newer security-definer policies run.
drop policy if exists "Utenti leggono e scrivono entries del proprio studio" on public.entries;
drop policy if exists "Accesso studio" on public.expenses;
drop policy if exists "Admin eliminano membri team" on public.profiles;
drop policy if exists "Admin modificano team, utenti modificano se stessi" on public.profiles;
drop policy if exists "Utenti vedono membri del proprio studio" on public.profiles;
drop policy if exists "Admin inseriscono progetti nel proprio studio" on public.projects;
drop policy if exists "Utenti leggono progetti del proprio studio" on public.projects;
drop policy if exists "Solo admin vedono dati stripe" on public.studios;
drop policy if exists "Utenti modificano il proprio studio" on public.studios;
drop policy if exists "Utenti vedono solo il proprio studio" on public.studios;

-- Keep studio data readable only within the caller's workspace and editable only
-- by its administrators. These helpers are SECURITY DEFINER and do not expose
-- profile rows to the browser.
drop policy if exists "studios_select" on public.studios;
create policy "studios_select"
on public.studios
for select
to authenticated
using (id = public.get_my_studio_id());

drop policy if exists "studios_update" on public.studios;
create policy "studios_update"
on public.studios
for update
to authenticated
using (id = public.get_my_studio_id() and public.is_admin())
with check (id = public.get_my_studio_id() and public.is_admin());

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update"
on public.expenses
for update
to authenticated
using (studio_id = public.get_my_studio_id() and public.is_admin())
with check (studio_id = public.get_my_studio_id() and public.is_admin());

commit;
