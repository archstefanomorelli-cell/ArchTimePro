-- Apply after billing-security-entitlement-hardening-2026-08-12.sql.
-- Back up production first. Existing projects retain team costs; only new UI-created
-- projects default to project costs. Existing entry.rate snapshots are never rewritten.

alter table public.projects
  add column if not exists cost_mode text not null default 'team';
alter table public.projects
  add column if not exists project_hourly_cost numeric;

alter table public.projects drop constraint if exists projects_cost_mode_check;
alter table public.projects add constraint projects_cost_mode_check
  check (cost_mode in ('team', 'project'));
alter table public.projects drop constraint if exists projects_project_hourly_cost_check;
alter table public.projects add constraint projects_project_hourly_cost_check
  check (project_hourly_cost is null or project_hourly_cost > 0);

do $$
begin
  if to_regprocedure('public.create_entry_for_app_internal(uuid,text,numeric,text,timestamptz)') is null
    or to_regprocedure('public.update_entry_for_app_internal(uuid,uuid,text,numeric,text,timestamptz)') is null then
    raise exception 'Prima applica billing-security-entitlement-hardening-2026-08-12.sql';
  end if;
end $$;

-- Separate admin-only endpoint avoids changing the existing get_projects_for_app
-- return signature, which also serves staff without economic fields.
create or replace function public.get_project_cost_settings_for_app()
returns table (id uuid, cost_mode text, project_hourly_cost numeric)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_studio uuid;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Permesso negato';
  end if;
  caller_studio := public.get_my_studio_id();
  if caller_studio is null then raise exception 'Studio non valido'; end if;
  return query
  select p.id, p.cost_mode, p.project_hourly_cost
  from public.projects p
  where p.studio_id = caller_studio;
end;
$$;
revoke all on function public.get_project_cost_settings_for_app() from public, anon, authenticated;
grant execute on function public.get_project_cost_settings_for_app() to authenticated;

-- The public entry RPCs remain the subscription-gated wrappers. Only their private
-- implementation functions change, so the entitlement check cannot be bypassed.
create or replace function public.create_entry_for_app_internal(
  entry_project_id uuid,
  entry_task text,
  entry_duration numeric,
  entry_notes text default '',
  entry_created_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_profile public.profiles%rowtype;
  target_project public.projects%rowtype;
  new_entry_id uuid;
  effective_at timestamptz;
  effective_cost numeric;
begin
  if (select auth.uid()) is null then raise exception 'Utente non autenticato'; end if;
  if entry_project_id is null then raise exception 'Progetto obbligatorio'; end if;
  if entry_duration is null or entry_duration <= 0 then raise exception 'Durata non valida'; end if;

  select * into caller_profile from public.profiles where id = (select auth.uid());
  if caller_profile.id is null or caller_profile.studio_id is null then
    raise exception 'Profilo non valido';
  end if;

  select * into target_project from public.projects
  where id = entry_project_id
    and studio_id = caller_profile.studio_id
    and coalesce(is_archived, false) = false;
  if target_project.id is null then raise exception 'Progetto non trovato o archiviato'; end if;

  effective_at := coalesce(entry_created_at, now());
  effective_cost := case when target_project.cost_mode = 'project'
    then coalesce(target_project.project_hourly_cost, 0)
    else public.get_hourly_cost_at(caller_profile.id, effective_at) end;

  insert into public.entries (
    studio_id, project_id, project_name, task, duration,
    user_email, user_name, rate, notes, created_at
  ) values (
    caller_profile.studio_id, target_project.id, target_project.name,
    coalesce(nullif(trim(entry_task), ''), 'Generico'), entry_duration,
    caller_profile.email, caller_profile.full_name,
    effective_cost * entry_duration, coalesce(entry_notes, ''), effective_at
  ) returning id into new_entry_id;
  return new_entry_id;
end;
$$;

create or replace function public.update_entry_for_app_internal(
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
set search_path = ''
as $$
declare
  caller_profile public.profiles%rowtype;
  target_entry public.entries%rowtype;
  target_project public.projects%rowtype;
  effective_at timestamptz;
  effective_cost numeric;
begin
  if (select auth.uid()) is null then raise exception 'Utente non autenticato'; end if;
  if entry_id is null then raise exception 'Attività obbligatoria'; end if;
  if entry_project_id is null then raise exception 'Progetto obbligatorio'; end if;
  if entry_duration is null or entry_duration <= 0 then raise exception 'Durata non valida'; end if;

  select * into caller_profile from public.profiles where id = (select auth.uid());
  if caller_profile.id is null or caller_profile.studio_id is null then
    raise exception 'Profilo non valido';
  end if;

  select * into target_entry from public.entries
  where id = entry_id and studio_id = caller_profile.studio_id;
  if target_entry.id is null then raise exception 'Attività non trovata'; end if;
  if target_entry.user_email is distinct from caller_profile.email then
    raise exception 'Puoi modificare solo le attività inserite da te';
  end if;

  select * into target_project from public.projects
  where id = entry_project_id
    and studio_id = caller_profile.studio_id
    and coalesce(is_archived, false) = false;
  if target_project.id is null then raise exception 'Progetto non trovato o archiviato'; end if;

  effective_at := coalesce(entry_created_at, target_entry.created_at);
  -- Editing an entry in the same project preserves its saved hourly snapshot.
  -- Moving it to another project adopts the destination project's current mode.
  effective_cost := case when target_entry.project_id = target_project.id
    then coalesce(target_entry.rate / nullif(target_entry.duration, 0), 0)
    when target_project.cost_mode = 'project'
      then coalesce(target_project.project_hourly_cost, 0)
    else public.get_hourly_cost_at(caller_profile.id, effective_at) end;

  update public.entries set
    project_id = target_project.id,
    project_name = target_project.name,
    task = coalesce(nullif(trim(entry_task), ''), 'Generico'),
    duration = entry_duration,
    notes = coalesce(entry_notes, ''),
    created_at = effective_at,
    user_email = caller_profile.email,
    user_name = caller_profile.full_name,
    rate = effective_cost * entry_duration
  where id = target_entry.id;
end;
$$;

revoke all on function public.create_entry_for_app_internal(uuid,text,numeric,text,timestamptz) from public, anon, authenticated;
revoke all on function public.update_entry_for_app_internal(uuid,uuid,text,numeric,text,timestamptz) from public, anon, authenticated;

-- First economic setup also counts a project-level cost, without requiring an
-- unrelated owner cost. The rest of the original telemetry rules stay intact.
create or replace function public.record_my_economic_activation(event_name_input text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_studio_id uuid;
  actor_cost numeric;
  eligible boolean := false;
  first_value_at timestamptz;
begin
  if actor_id is null then return false; end if;
  select p.studio_id, p.hourly_cost into actor_studio_id, actor_cost
  from public.profiles p
  where p.id = actor_id and (coalesce(p.is_owner, false) or p.role = 'admin');
  if actor_studio_id is null then return false; end if;
  if event_name_input not in ('economic_setup_completed', 'first_economic_value_seen', 'return_after_activation')
    or event_name_input is null then return false; end if;

  if event_name_input = 'economic_setup_completed' then
    select exists (
      select 1 from public.projects p
      where p.studio_id = actor_studio_id and p.is_demo = false and p.budget > 0
        and ((p.cost_mode = 'project' and coalesce(p.project_hourly_cost, 0) > 0)
          or (p.cost_mode = 'team' and coalesce(actor_cost, 0) > 0))
    ) into eligible;
  elsif event_name_input = 'first_economic_value_seen' then
    select exists (
      select 1 from public.projects p
      join public.entries e on e.project_id = p.id and e.studio_id = p.studio_id
      where p.studio_id = actor_studio_id and p.is_demo = false and p.budget > 0
        and e.duration > 0
      group by p.id
      having sum(e.duration) >= 0.25 and bool_and(coalesce(e.rate, 0) > 0)
    ) into eligible;
  else
    select min(e.created_at) into first_value_at from public.onboarding_events e
    where e.studio_id = actor_studio_id and e.event_name = 'first_economic_value_seen';
    eligible := first_value_at is not null
      and (now() at time zone 'Europe/Rome')::date > (first_value_at at time zone 'Europe/Rome')::date;
  end if;
  if not coalesce(eligible, false) then return false; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_studio_id::text || event_name_input, 0));
  if exists (
    select 1 from public.onboarding_events e
    where e.studio_id = actor_studio_id and e.event_name = event_name_input
      and (event_name_input <> 'return_after_activation'
        or (e.created_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date)
  ) then return false; end if;
  insert into public.onboarding_events (studio_id, profile_id, event_name)
  values (actor_studio_id, actor_id, event_name_input);
  return true;
end;
$$;
revoke all on function public.record_my_economic_activation(text) from public, anon, authenticated;
grant execute on function public.record_my_economic_activation(text) to authenticated;

-- Manual smoke checks after applying:
-- 1. Existing projects read cost_mode='team' and retain their entry.rate values.
-- 2. An admin can call get_project_cost_settings_for_app(); staff cannot.
-- 3. Create an hour in each mode; verify entry.rate = duration * selected cost.
-- 4. Change a project's mode, then edit an old entry in place; its hourly cost stays fixed.
