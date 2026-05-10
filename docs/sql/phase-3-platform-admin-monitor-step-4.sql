-- Step 4 - feedback read RPC and grants

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
as $function$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can read beta feedback';
  end if;

  return query
  select
    f.id,
    f.created_at,
    f.name::text,
    f.email::text,
    f.profile::text,
    f.message::text,
    f.status::text,
    f.priority::text
  from public.beta_feedback f
  order by f.created_at desc
  limit 50;
end;
$function$;

revoke all on public.platform_studio_notes from anon, authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.get_platform_beta_monitor() to authenticated;
grant execute on function public.update_platform_studio_note(uuid, text, text) to authenticated;
grant execute on function public.get_platform_feedback() to authenticated;

comment on table public.platform_studio_notes is 'Internal founder notes for beta monitoring. No direct RLS access; managed through platform admin RPC.';
