-- Phase 3 - internal beta monitor for Arch Time Pro
-- Run in Supabase SQL Editor after backing up schema/functions.

create table if not exists public.platform_studio_notes (
  studio_id uuid primary key references public.studios(id) on delete cascade,
  beta_status text not null default 'new',
  internal_notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.platform_studio_notes enable row level security;

alter table public.platform_studio_notes
drop constraint if exists platform_studio_notes_beta_status_check;

alter table public.platform_studio_notes
add constraint platform_studio_notes_beta_status_check
check (beta_status in ('new', 'active', 'follow_up', 'not_interested', 'convertible'));

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'info@archtimepro.it',
    'moroz81@hotmail.it'
  );
$$;

create or replace function public.get_platform_beta_monitor()
returns table (
  studio_id uuid,
  studio_name text,
  business_type text,
  created_at timestamptz,
  members_count bigint,
  active_members_count bigint,
  projects_count bigint,
  active_projects_count bigint,
  entries_count bigint,
  expenses_count bigint,
  last_activity_at timestamptz,
  beta_status text,
  internal_notes text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can read beta monitor data';
  end if;

  return query
  select
    s.id as studio_id,
    s.name as studio_name,
    coalesce(s.business_type, 'studio') as business_type,
    nullif(to_jsonb(s) ->> 'created_at', '')::timestamptz as created_at,
    coalesce(member_stats.members_count, 0) as members_count,
    coalesce(member_stats.active_members_count, 0) as active_members_count,
    coalesce(project_stats.projects_count, 0) as projects_count,
    coalesce(project_stats.active_projects_count, 0) as active_projects_count,
    coalesce(entry_stats.entries_count, 0) as entries_count,
    coalesce(expense_stats.expenses_count, 0) as expenses_count,
    greatest(
      coalesce(entry_stats.last_entry_at, 'epoch'::timestamptz),
      coalesce(expense_stats.last_expense_at, 'epoch'::timestamptz)
    ) as last_activity_at,
    coalesce(notes.beta_status, 'new') as beta_status,
    notes.internal_notes
  from public.studios s
  left join lateral (
    select
      count(*) as members_count,
      count(*) filter (where coalesce(p.role, '') <> 'inactive') as active_members_count
    from public.profiles p
    where p.studio_id = s.id
  ) member_stats on true
  left join lateral (
    select
      count(*) as projects_count,
      count(*) filter (where coalesce(pr.is_archived, false) = false) as active_projects_count
    from public.projects pr
    where pr.studio_id = s.id
  ) project_stats on true
  left join lateral (
    select
      count(*) as entries_count,
      max(e.created_at) as last_entry_at
    from public.entries e
    where e.studio_id = s.id
  ) entry_stats on true
  left join lateral (
    select
      count(*) as expenses_count,
      max(ex.created_at) as last_expense_at
    from public.expenses ex
    where ex.studio_id = s.id
  ) expense_stats on true
  left join public.platform_studio_notes notes on notes.studio_id = s.id
  order by
    nullif(to_jsonb(s) ->> 'created_at', '')::timestamptz desc nulls last,
    s.name asc;
end;
$$;

create or replace function public.update_platform_studio_note(
  target_studio_id uuid,
  new_beta_status text,
  new_internal_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can update beta notes';
  end if;

  if new_beta_status not in ('new', 'active', 'follow_up', 'not_interested', 'convertible') then
    raise exception 'Invalid beta status';
  end if;

  insert into public.platform_studio_notes (
    studio_id,
    beta_status,
    internal_notes,
    updated_at,
    updated_by
  )
  values (
    target_studio_id,
    new_beta_status,
    nullif(trim(coalesce(new_internal_notes, '')), ''),
    now(),
    auth.uid()
  )
  on conflict (studio_id)
  do update set
    beta_status = excluded.beta_status,
    internal_notes = excluded.internal_notes,
    updated_at = now(),
    updated_by = auth.uid();
end;
$$;

create or replace function public.get_platform_feedback()
returns table (
  id uuid,
  created_at timestamptz,
  name text,
  email text,
  profile text,
  message text,
  status text,
  priority text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can read beta feedback';
  end if;

  return query
  select
    f.id,
    f.created_at,
    f.name,
    f.email,
    f.profile,
    f.message,
    f.status,
    f.priority
  from public.beta_feedback f
  order by f.created_at desc
  limit 50;
end;
$$;

revoke all on public.platform_studio_notes from anon, authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.get_platform_beta_monitor() to authenticated;
grant execute on function public.update_platform_studio_note(uuid, text, text) to authenticated;
grant execute on function public.get_platform_feedback() to authenticated;

comment on table public.platform_studio_notes is 'Internal founder notes for beta monitoring. No direct RLS access; managed through platform admin RPC.';
