-- Phase 4 - Project setup type and normative service snapshot
-- Run in Supabase SQL Editor after a backup.

alter table public.projects
add column if not exists project_setup_type text not null default 'studio';

alter table public.projects
drop constraint if exists projects_project_setup_type_check;

alter table public.projects
add constraint projects_project_setup_type_check
check (project_setup_type in ('studio', 'normative'));

alter table public.projects
add column if not exists normative_data jsonb not null default '{}'::jsonb;

drop function if exists public.get_projects_for_app();

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
    coalesce(p.task_statuses, '{}'::jsonb) as task_statuses,
    case when is_admin() then coalesce(p.task_budgets, '{}'::jsonb) else '{}'::jsonb end as task_budgets,
    p.is_archived,
    coalesce(p.project_setup_type, 'studio') as project_setup_type,
    coalesce(p.normative_data, '{}'::jsonb) as normative_data
  from public.projects p
  where p.studio_id = caller_studio
  order by p.name;
end;
$$;

grant execute on function public.get_projects_for_app() to authenticated;
