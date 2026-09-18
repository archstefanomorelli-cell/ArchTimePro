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
grant insert on table public.onboarding_events to authenticated;
grant all on table public.onboarding_events to service_role;

drop policy if exists "Users insert own studio onboarding events" on public.onboarding_events;
create policy "Users insert own studio onboarding events"
  on public.onboarding_events
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.studio_id = onboarding_events.studio_id
    )
  );
