-- Acquisition funnel milestones used to measure activation without storing PII.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.acquisition_milestones (
  studio_id uuid not null references public.studios(id) on delete cascade,
  event_key text not null check (
    event_key in ('first_project_created', 'first_time_entry', 'subscription_active')
  ),
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  primary key (studio_id, event_key)
);

-- Existing studios are seeded so the release does not generate retroactive events.
insert into private.acquisition_milestones (studio_id, event_key, occurred_at)
select project.studio_id, 'first_project_created', min(project.created_at)
from public.projects project
where project.studio_id is not null
  and project.is_demo = false
group by project.studio_id
on conflict (studio_id, event_key) do nothing;

insert into private.acquisition_milestones (studio_id, event_key, occurred_at)
select entry.studio_id, 'first_time_entry', min(entry.created_at)
from public.entries entry
join public.projects project on project.id = entry.project_id
where entry.studio_id is not null
  and project.is_demo = false
group by entry.studio_id
on conflict (studio_id, event_key) do nothing;

insert into private.acquisition_milestones (studio_id, event_key, occurred_at)
select studio.id, 'subscription_active', now()
from public.studios studio
where studio.subscription_status = 'active'
  and studio.stripe_subscription_id is not null
on conflict (studio_id, event_key) do nothing;

create or replace function public.claim_acquisition_milestone(target_event text)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_studio_id uuid;
  is_eligible boolean := false;
  inserted_rows integer := 0;
begin
  if auth.uid() is null then
    return false;
  end if;

  select profile.studio_id
  into actor_studio_id
  from public.profiles profile
  where profile.id = auth.uid()
    and profile.studio_id is not null
    and (coalesce(profile.is_owner, false) or profile.role in ('admin', 'owner'))
  limit 1;

  if actor_studio_id is null then
    return false;
  end if;

  if target_event = 'first_project_created' then
    select exists (
      select 1
      from public.projects project
      where project.studio_id = actor_studio_id
        and project.is_demo = false
    ) into is_eligible;
  elsif target_event = 'first_time_entry' then
    select exists (
      select 1
      from public.entries entry
      join public.projects project on project.id = entry.project_id
      where entry.studio_id = actor_studio_id
        and project.is_demo = false
    ) into is_eligible;
  elsif target_event = 'subscription_active' then
    select exists (
      select 1
      from public.studios studio
      where studio.id = actor_studio_id
        and studio.subscription_status = 'active'
        and studio.stripe_subscription_id is not null
    ) into is_eligible;
  else
    return false;
  end if;

  if not is_eligible then
    return false;
  end if;

  insert into private.acquisition_milestones (studio_id, event_key)
  values (actor_studio_id, target_event)
  on conflict (studio_id, event_key) do nothing;

  get diagnostics inserted_rows = row_count;
  return inserted_rows = 1;
end;
$$;

revoke all on function public.claim_acquisition_milestone(text) from public, anon;
grant execute on function public.claim_acquisition_milestone(text) to authenticated;

