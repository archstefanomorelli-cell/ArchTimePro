-- Phase 3 - Project rhythm / task statuses
-- Run in Supabase SQL Editor after a backup.

alter table public.projects
add column if not exists task_statuses jsonb not null default '{}'::jsonb;

-- Recreate get_projects_for_app so the frontend receives task_statuses.
-- Staff still receives NULL budget; task statuses are operational data.
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
    coalesce(p.task_statuses, '{}'::jsonb) as task_statuses,
    p.is_archived
  from public.projects p
  where p.studio_id = caller_studio
  order by p.name;
end;
$$;

grant execute on function public.get_projects_for_app() to authenticated;
