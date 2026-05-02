-- Phase 3 - Secure entry creation
-- Run in Supabase SQL Editor after deploying the frontend that calls create_entry_for_app.

create or replace function public.create_entry_for_app(
  entry_project_id uuid,
  entry_task text,
  entry_duration numeric,
  entry_notes text default '',
  entry_created_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_profile public.profiles%rowtype;
  target_project public.projects%rowtype;
  new_entry_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  if entry_project_id is null then
    raise exception 'Progetto obbligatorio';
  end if;

  if entry_duration is null or entry_duration <= 0 then
    raise exception 'Durata non valida';
  end if;

  select *
  into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.id is null or caller_profile.studio_id is null then
    raise exception 'Profilo non valido';
  end if;

  select *
  into target_project
  from public.projects
  where id = entry_project_id
    and studio_id = caller_profile.studio_id
    and coalesce(is_archived, false) = false;

  if target_project.id is null then
    raise exception 'Progetto non trovato o archiviato';
  end if;

  insert into public.entries (
    studio_id,
    project_id,
    project_name,
    task,
    duration,
    user_email,
    user_name,
    rate,
    notes,
    created_at
  )
  values (
    caller_profile.studio_id,
    target_project.id,
    target_project.name,
    coalesce(nullif(trim(entry_task), ''), 'Generico'),
    entry_duration,
    caller_profile.email,
    caller_profile.full_name,
    coalesce(caller_profile.hourly_cost, 0) * entry_duration,
    coalesce(entry_notes, ''),
    coalesce(entry_created_at, now())
  )
  returning id into new_entry_id;

  return new_entry_id;
end;
$$;

grant execute on function public.create_entry_for_app(uuid, text, numeric, text, timestamptz) to authenticated;

-- Optional lock-down once frontend deploy and RPC test are confirmed.
-- This prevents direct client inserts that could spoof rate/user/project_name.
alter policy "entries_insert"
on public.entries
with check (
  is_admin()
  and studio_id = get_my_studio_id()
);
