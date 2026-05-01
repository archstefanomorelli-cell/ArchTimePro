-- Phase 3 - Secure app data access
-- Run in Supabase SQL Editor after backing up policies/functions.

-- Projects for the frontend.
-- Admin receives budget; staff receives NULL budget.
create or replace function public.get_projects_for_app()
returns table (
  id uuid,
  studio_id uuid,
  name text,
  client text,
  budget numeric,
  tasks jsonb,
  is_archived boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_studio uuid;
begin
  caller_studio := get_my_studio_id();

  if caller_studio is null then
    raise exception 'Utente senza studio';
  end if;

  return query
  select
    p.id,
    p.studio_id,
    p.name,
    p.client,
    case when is_admin() then p.budget::numeric else null::numeric end as budget,
    to_jsonb(p.tasks) as tasks,
    p.is_archived
  from public.projects p
  where p.studio_id = caller_studio
  order by p.name;
end;
$$;

-- Entries for the frontend.
-- Admin receives all entries with rate; staff receives only own entries and NULL rate.
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
begin
  caller_studio := get_my_studio_id();

  if caller_studio is null then
    raise exception 'Utente senza studio';
  end if;

  select email
  into caller_email
  from public.profiles
  where id = auth.uid();

  return query
  select
    e.id,
    e.studio_id,
    e.project_id,
    e.project_name,
    e.task,
    e.duration::numeric,
    e.user_email,
    e.user_name,
    case when is_admin() then e.rate::numeric else null::numeric end as rate,
    e.notes,
    e.created_at
  from public.entries e
  where e.studio_id = caller_studio
    and (is_admin() or e.user_email = caller_email)
  order by e.created_at desc
  limit 2000;
end;
$$;

-- Expenses for the frontend.
-- Admin only. Staff gets an empty result set.
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
declare
  caller_studio uuid;
begin
  caller_studio := get_my_studio_id();

  if caller_studio is null then
    raise exception 'Utente senza studio';
  end if;

  if not is_admin() then
    return;
  end if;

  return query
  select
    ex.id,
    ex.studio_id,
    ex.project_id,
    ex.description,
    ex.amount::numeric,
    ex.user_name,
    ex.created_at
  from public.expenses ex
  where ex.studio_id = caller_studio
  order by ex.created_at desc;
end;
$$;

grant execute on function public.get_projects_for_app() to authenticated;
grant execute on function public.get_entries_for_app() to authenticated;
grant execute on function public.get_expenses_for_app() to authenticated;

-- Optional lock-down once the deployed frontend is confirmed to use the RPCs above.
-- These direct SELECT policies prevent staff from querying sensitive columns via PostgREST.
-- Keep project/entry/expense insert/update/delete policies as configured in Phase 2.

alter policy "projects_select"
on public.projects
using (
  is_admin()
  and studio_id = get_my_studio_id()
);

alter policy "entries_select"
on public.entries
using (
  is_admin()
  and studio_id = get_my_studio_id()
);

alter policy "expenses_select"
on public.expenses
using (
  is_admin()
  and studio_id = get_my_studio_id()
);
