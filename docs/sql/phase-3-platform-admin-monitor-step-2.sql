-- Step 2 - beta monitor read RPC

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
as $function$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can read beta monitor data';
  end if;

  return query
  select
    s.id as studio_id,
    s.name::text as studio_name,
    coalesce(s.business_type, 'studio')::text as business_type,
    nullif(to_jsonb(s) ->> 'created_at', '')::timestamptz as created_at,
    coalesce(member_stats.members_count, 0)::bigint as members_count,
    coalesce(member_stats.active_members_count, 0)::bigint as active_members_count,
    coalesce(project_stats.projects_count, 0)::bigint as projects_count,
    coalesce(project_stats.active_projects_count, 0)::bigint as active_projects_count,
    coalesce(entry_stats.entries_count, 0)::bigint as entries_count,
    coalesce(expense_stats.expenses_count, 0)::bigint as expenses_count,
    greatest(
      coalesce(entry_stats.last_entry_at, 'epoch'::timestamptz),
      coalesce(expense_stats.last_expense_at, 'epoch'::timestamptz)
    ) as last_activity_at,
    coalesce(notes.beta_status, 'new')::text as beta_status,
    notes.internal_notes::text as internal_notes
  from public.studios s
  left join lateral (
    select
      count(*)::bigint as members_count,
      count(*) filter (where coalesce(p.role, '') <> 'inactive')::bigint as active_members_count
    from public.profiles p
    where p.studio_id = s.id
  ) member_stats on true
  left join lateral (
    select
      count(*)::bigint as projects_count,
      count(*) filter (where coalesce(pr.is_archived, false) = false)::bigint as active_projects_count
    from public.projects pr
    where pr.studio_id = s.id
  ) project_stats on true
  left join lateral (
    select
      count(*)::bigint as entries_count,
      max(e.created_at) as last_entry_at
    from public.entries e
    where e.studio_id = s.id
  ) entry_stats on true
  left join lateral (
    select
      count(*)::bigint as expenses_count,
      max(ex.created_at) as last_expense_at
    from public.expenses ex
    where ex.studio_id = s.id
  ) expense_stats on true
  left join public.platform_studio_notes notes on notes.studio_id = s.id
  order by
    nullif(to_jsonb(s) ->> 'created_at', '')::timestamptz desc nulls last,
    s.name asc;
end;
$function$;
