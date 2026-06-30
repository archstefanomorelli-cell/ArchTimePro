-- Phase 3 - Staff can update/delete only their own time entries.
-- Run in Supabase SQL Editor before deploying the frontend that calls these RPCs.

create or replace function public.update_entry_for_app(
  entry_id uuid,
  entry_project_id uuid,
  entry_task text,
  entry_duration numeric,
  entry_notes text default '',
  entry_created_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_profile public.profiles%rowtype;
  target_entry public.entries%rowtype;
  target_project public.projects%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  if entry_id is null then
    raise exception 'Attività obbligatoria';
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
  into target_entry
  from public.entries
  where id = entry_id
    and studio_id = caller_profile.studio_id;

  if target_entry.id is null then
    raise exception 'Attività non trovata';
  end if;

  if target_entry.user_email is distinct from caller_profile.email then
    raise exception 'Puoi modificare solo le attività inserite da te';
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

  update public.entries
  set
    project_id = target_project.id,
    project_name = target_project.name,
    task = coalesce(nullif(trim(entry_task), ''), 'Generico'),
    duration = entry_duration,
    notes = coalesce(entry_notes, ''),
    created_at = coalesce(entry_created_at, target_entry.created_at),
    user_email = caller_profile.email,
    user_name = caller_profile.full_name,
    rate = coalesce(caller_profile.hourly_cost, 0) * entry_duration
  where id = target_entry.id;
end;
$$;

create or replace function public.delete_entry_for_app(entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_profile public.profiles%rowtype;
  target_entry public.entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Utente non autenticato';
  end if;

  if entry_id is null then
    raise exception 'Attività obbligatoria';
  end if;

  select *
  into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.id is null or caller_profile.studio_id is null then
    raise exception 'Profilo non valido';
  end if;

  select *
  into target_entry
  from public.entries
  where id = entry_id
    and studio_id = caller_profile.studio_id;

  if target_entry.id is null then
    raise exception 'Attività non trovata';
  end if;

  if target_entry.user_email is distinct from caller_profile.email then
    raise exception 'Puoi eliminare solo le attività inserite da te';
  end if;

  delete from public.entries
  where id = target_entry.id;
end;
$$;

grant execute on function public.update_entry_for_app(uuid, uuid, text, numeric, text, timestamptz) to authenticated;
grant execute on function public.delete_entry_for_app(uuid) to authenticated;
