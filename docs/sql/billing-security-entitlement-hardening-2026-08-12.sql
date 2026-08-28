begin;

-- Centralized entitlement and legal-version checks.
create or replace function public.has_current_legal_acceptance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.legal_acceptances acceptance
      where acceptance.user_id = auth.uid()
        and acceptance.terms_version = '2026-08-12'
        and acceptance.privacy_version = '2026-08-12'
    );
$$;

create or replace function public.has_operational_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles profile
      join public.studios studio on studio.id = profile.studio_id
      where profile.id = auth.uid()
        and (
          studio.subscription_status in ('active', 'free')
          or (
            studio.subscription_status = 'trialing'
            and studio.trial_ends_at > now()
          )
        )
    );
$$;

create or replace function public.has_operational_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_operational_subscription()
    and public.has_current_legal_acceptance();
$$;

create or replace function public.assert_operational_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.has_operational_subscription() then
    raise exception 'SUBSCRIPTION_REQUIRED';
  end if;

  if not public.has_current_legal_acceptance() then
    raise exception 'LEGAL_ACCEPTANCE_REQUIRED';
  end if;
end;
$$;

-- Return only the studio fields required by the application. Stripe identifiers
-- remain private; the UI receives two booleans for its billing controls.
create or replace function public.get_my_studio_for_app()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  logo_url text,
  subscription_status text,
  activity_catalog jsonb,
  project_templates jsonb,
  demo_generated boolean,
  plan_type text,
  business_type text,
  quote_settings jsonb,
  currency text,
  has_stripe_customer boolean,
  has_stripe_subscription boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    studio.id,
    studio.name,
    studio.created_at,
    studio.logo_url,
    studio.subscription_status,
    studio.activity_catalog,
    studio.project_templates,
    studio.demo_generated,
    studio.plan_type,
    studio.business_type,
    studio.quote_settings,
    studio.currency,
    studio.stripe_customer_id is not null,
    studio.stripe_subscription_id is not null
  from public.profiles profile
  join public.studios studio on studio.id = profile.studio_id
  where profile.id = auth.uid();
$$;

-- Preserve the current implementations and place access checks in stable wrappers.
do $$
begin
  if to_regprocedure('public.get_projects_for_app_internal()') is null then
    alter function public.get_projects_for_app() rename to get_projects_for_app_internal;
  end if;
  if to_regprocedure('public.get_entries_for_app_internal()') is null then
    alter function public.get_entries_for_app() rename to get_entries_for_app_internal;
  end if;
  if to_regprocedure('public.get_expenses_for_app_internal()') is null then
    alter function public.get_expenses_for_app() rename to get_expenses_for_app_internal;
  end if;
  if to_regprocedure('public.get_team_profiles_for_app_internal()') is null then
    alter function public.get_team_profiles_for_app() rename to get_team_profiles_for_app_internal;
  end if;
  if to_regprocedure('public.create_entry_for_app_internal(uuid,text,numeric,text,timestamptz)') is null then
    alter function public.create_entry_for_app(uuid, text, numeric, text, timestamptz) rename to create_entry_for_app_internal;
  end if;
  if to_regprocedure('public.update_entry_for_app_internal(uuid,uuid,text,numeric,text,timestamptz)') is null then
    alter function public.update_entry_for_app(uuid, uuid, text, numeric, text, timestamptz) rename to update_entry_for_app_internal;
  end if;
  if to_regprocedure('public.delete_entry_for_app_internal(uuid)') is null then
    alter function public.delete_entry_for_app(uuid) rename to delete_entry_for_app_internal;
  end if;
  if to_regprocedure('public.set_my_timer_state_internal(text,text,text,text)') is null then
    alter function public.set_my_timer_state(text, text, text, text) rename to set_my_timer_state_internal;
  end if;
  if to_regprocedure('public.set_my_hourly_cost_internal(numeric)') is null then
    alter function public.set_my_hourly_cost(numeric) rename to set_my_hourly_cost_internal;
  end if;
  if to_regprocedure('public.update_team_member_for_app_internal(uuid,text,numeric,text,boolean)') is null then
    alter function public.update_team_member_for_app(uuid, text, numeric, text, boolean) rename to update_team_member_for_app_internal;
  end if;
  if to_regprocedure('public.kick_user_from_studio_internal(uuid)') is null then
    alter function public.kick_user_from_studio(uuid) rename to kick_user_from_studio_internal;
  end if;
end $$;

create or replace function public.get_projects_for_app()
returns table (
  id uuid,
  studio_id uuid,
  name text,
  client text,
  budget numeric,
  tasks jsonb,
  task_statuses jsonb,
  task_budgets jsonb,
  is_archived boolean,
  project_setup_type text,
  normative_data jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  return query select * from public.get_projects_for_app_internal();
end;
$$;

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
begin
  perform public.assert_operational_access();
  return query select * from public.get_entries_for_app_internal();
end;
$$;

create or replace function public.get_expenses_for_app()
returns table (
  id uuid,
  studio_id uuid,
  project_id uuid,
  description text,
  amount numeric,
  user_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  return query select * from public.get_expenses_for_app_internal();
end;
$$;

create or replace function public.get_team_profiles_for_app()
returns table (
  id uuid,
  studio_id uuid,
  full_name text,
  email text,
  role text,
  is_owner boolean,
  hourly_cost numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  return query select * from public.get_team_profiles_for_app_internal();
end;
$$;

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
begin
  perform public.assert_operational_access();
  return public.create_entry_for_app_internal(
    entry_project_id,
    entry_task,
    entry_duration,
    entry_notes,
    entry_created_at
  );
end;
$$;

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
begin
  perform public.assert_operational_access();
  perform public.update_entry_for_app_internal(
    entry_id,
    entry_project_id,
    entry_task,
    entry_duration,
    entry_notes,
    entry_created_at
  );
end;
$$;

create or replace function public.delete_entry_for_app(entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  perform public.delete_entry_for_app_internal(entry_id);
end;
$$;

create or replace function public.set_my_timer_state(
  timer_start text default null,
  timer_project text default null,
  timer_task text default null,
  timer_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  perform public.set_my_timer_state_internal(
    timer_start,
    timer_project,
    timer_task,
    timer_notes
  );
end;
$$;

create or replace function public.set_my_hourly_cost(new_hourly_cost numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  perform public.set_my_hourly_cost_internal(new_hourly_cost);
end;
$$;

create or replace function public.update_team_member_for_app(
  target_profile_id uuid,
  target_full_name text,
  target_hourly_cost numeric,
  target_role text,
  transfer_ownership boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  perform public.update_team_member_for_app_internal(
    target_profile_id,
    target_full_name,
    target_hourly_cost,
    target_role,
    transfer_ownership
  );
end;
$$;

create or replace function public.kick_user_from_studio(user_to_kick uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_operational_access();
  perform public.kick_user_from_studio_internal(user_to_kick);
end;
$$;

-- Dedicated export RPCs remain available after expiration or cancellation.
create or replace function public.get_projects_for_export()
returns table (
  id uuid,
  studio_id uuid,
  name text,
  client text,
  budget numeric,
  tasks jsonb,
  task_statuses jsonb,
  task_budgets jsonb,
  is_archived boolean,
  project_setup_type text,
  normative_data jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  caller_is_admin := public.is_admin();

  return query
  select
    project.id,
    project.studio_id,
    project.name,
    project.client,
    case when caller_is_admin then project.budget::numeric else null::numeric end,
    to_jsonb(project.tasks),
    coalesce(to_jsonb(project.task_statuses), '{}'::jsonb),
    case when caller_is_admin then coalesce(to_jsonb(project.task_budgets), '{}'::jsonb) else '{}'::jsonb end,
    project.is_archived,
    project.project_setup_type,
    project.normative_data
  from public.projects project
  where project.studio_id = public.get_my_studio_id()
  order by project.name;
end;
$$;

create or replace function public.get_expenses_for_export()
returns table (
  id uuid,
  studio_id uuid,
  project_id uuid,
  description text,
  amount numeric,
  user_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return;
  end if;

  return query
  select expense.id, expense.studio_id, expense.project_id, expense.description,
         expense.amount::numeric, expense.user_name, expense.created_at
  from public.expenses expense
  where expense.studio_id = public.get_my_studio_id()
  order by expense.created_at desc;
end;
$$;

create or replace function public.get_team_profiles_for_export()
returns table (
  id uuid,
  studio_id uuid,
  full_name text,
  email text,
  role text,
  is_owner boolean,
  hourly_cost numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return;
  end if;
  return query select * from public.get_team_profiles_for_app_internal();
end;
$$;

-- Billing and Stripe columns are service-owned. Authenticated studio admins may
-- only update normal studio settings, with RLS still restricting the row.
revoke all on public.studios from public, anon, authenticated;
grant all on public.studios to service_role;
grant select (id) on public.studios to authenticated;
grant update (
  name,
  logo_url,
  activity_catalog,
  project_templates,
  demo_generated,
  business_type,
  quote_settings,
  currency
) on public.studios to authenticated;

drop policy if exists "studios_select" on public.studios;
create policy "studios_select"
on public.studios for select to authenticated
using (id = public.get_my_studio_id());

drop policy if exists "studios_update" on public.studios;
create policy "studios_update"
on public.studios for update to authenticated
using (
  id = public.get_my_studio_id()
  and public.is_admin()
  and public.has_operational_access()
)
with check (
  id = public.get_my_studio_id()
  and public.is_admin()
  and public.has_operational_access()
);

drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects for insert to authenticated
with check (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects for update to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id())
with check (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects for delete to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());

drop policy if exists "entries_select" on public.entries;
create policy "entries_select" on public.entries for select to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "entries_insert" on public.entries;
create policy "entries_insert" on public.entries for insert to authenticated
with check (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "entries_update" on public.entries;
create policy "entries_update" on public.entries for update to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id())
with check (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "entries_delete" on public.entries;
create policy "entries_delete" on public.entries for delete to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses for select to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses for insert to authenticated
with check (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses for update to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id())
with check (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());
drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses for delete to authenticated
using (public.has_operational_access() and public.is_admin() and studio_id = public.get_my_studio_id());

-- Remove PUBLIC/anon execution from every privileged function, then grant only
-- the explicit application surface to authenticated users.
do $$
declare
  privileged_function record;
begin
  for privileged_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', privileged_function.signature);
  end loop;
end $$;

do $$
declare
  app_function record;
begin
  for app_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'accept_legal_documents',
        'create_entry_for_app',
        'create_studio_from_limbo',
        'delete_entry_for_app',
        'delete_user_account',
        'get_entries_for_app',
        'get_entries_for_export',
        'get_expenses_for_app',
        'get_expenses_for_export',
        'get_my_profile_for_app',
        'get_my_studio_for_app',
        'get_my_studio_id',
        'get_platform_beta_monitor',
        'get_platform_feedback',
        'get_projects_for_app',
        'get_projects_for_export',
        'get_team_profiles_for_app',
        'get_team_profiles_for_export',
        'has_accepted_legal_documents',
        'has_current_legal_acceptance',
        'has_operational_access',
        'has_operational_subscription',
        'is_admin',
        'is_platform_admin',
        'join_studio_with_code',
        'kick_user_from_studio',
        'set_my_hourly_cost',
        'set_my_timer_state',
        'update_entry_for_app',
        'update_platform_studio_note',
        'update_team_member_for_app'
      ])
  loop
    execute format('grant execute on function %s to authenticated', app_function.signature);
  end loop;
end $$;

grant execute on function public.claim_trial_lifecycle_emails(integer) to service_role;

commit;
