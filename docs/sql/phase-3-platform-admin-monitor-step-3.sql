-- Step 3 - beta notes update RPC

create or replace function public.update_platform_studio_note(
  target_studio_id uuid,
  new_beta_status text,
  new_internal_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
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
$function$;
