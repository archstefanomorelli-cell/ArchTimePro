-- Minimal activation telemetry for the first-use flow.
-- Applied to production on 2026-09-18.

create table if not exists public.onboarding_events (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null check (
    event_name in (
      'onboarding_viewed',
      'onboarding_dismissed',
      'onboarding_project_created',
      'first_value_seen'
    )
  ),
  reason text check (
    reason is null or reason in (
      'missing_data',
      'exploring',
      'unclear',
      'not_relevant',
      'no_answer'
    )
  ),
  created_at timestamptz not null default now()
);

comment on table public.onboarding_events is
  'Minimal first-use activation events used to improve onboarding; contains no client or project content.';

create index if not exists onboarding_events_studio_created_idx
  on public.onboarding_events (studio_id, created_at desc);

create index if not exists onboarding_events_profile_created_idx
  on public.onboarding_events (profile_id, created_at desc);

alter table public.onboarding_events enable row level security;

revoke all on table public.onboarding_events from anon, authenticated;
grant all on table public.onboarding_events to service_role;

drop policy if exists "Users insert own studio onboarding events" on public.onboarding_events;

create or replace function public.record_my_onboarding_event(
  event_name_input text,
  reason_input text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  current_studio_id uuid;
begin
  if current_profile_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if event_name_input not in (
    'onboarding_viewed',
    'onboarding_dismissed',
    'onboarding_project_created',
    'first_value_seen'
  ) then
    raise exception 'Unsupported onboarding event';
  end if;

  if reason_input is not null and reason_input not in (
    'missing_data',
    'exploring',
    'unclear',
    'not_relevant',
    'no_answer'
  ) then
    raise exception 'Unsupported onboarding reason';
  end if;

  select p.studio_id
  into current_studio_id
  from public.profiles p
  where p.id = current_profile_id;

  if current_studio_id is null then
    raise exception 'Profile is not connected to a studio' using errcode = '42501';
  end if;

  insert into public.onboarding_events (
    studio_id,
    profile_id,
    event_name,
    reason
  ) values (
    current_studio_id,
    current_profile_id,
    event_name_input,
    reason_input
  );
end;
$$;

revoke execute on function public.record_my_onboarding_event(text, text) from public, anon;
grant execute on function public.record_my_onboarding_event(text, text) to authenticated, service_role;
