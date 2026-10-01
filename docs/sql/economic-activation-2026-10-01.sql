-- Additive telemetry only. No project, profile, entry or billing data is changed.
alter table public.onboarding_events drop constraint onboarding_events_event_name_check;
alter table public.onboarding_events add constraint onboarding_events_event_name_check check (
  event_name in ('onboarding_viewed', 'onboarding_dismissed', 'onboarding_project_created',
    'first_value_seen', 'economic_setup_completed', 'first_economic_value_seen', 'return_after_activation')
);

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
    select coalesce(actor_cost, 0) > 0 and exists (
      select 1 from public.projects p where p.studio_id = actor_studio_id
        and p.is_demo = false and p.budget > 0
    ) into eligible;
  elsif event_name_input = 'first_economic_value_seen' then
    -- A real, costed quarter-hour is an activation signal; a seconds-long test is not.
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

  -- Serialise claims from tabs/devices without exposing the private event table.
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
revoke all on function public.record_my_economic_activation(text) from public, anon;
grant execute on function public.record_my_economic_activation(text) to authenticated;

comment on function public.record_my_economic_activation(text) is
  'Verified real economic activation, deduplicated per studio; returns once per later calendar day. No client/project content is collected.';
