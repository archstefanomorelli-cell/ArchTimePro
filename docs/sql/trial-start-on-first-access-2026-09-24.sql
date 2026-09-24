begin;

alter table public.studios
add column if not exists trial_started_at timestamptz;

update public.studios
set trial_started_at = created_at
where trial_ends_at is not null
  and trial_started_at is null;

alter table public.studios
alter column trial_ends_at drop default,
alter column trial_ends_at drop not null;

-- A registration that has never been confirmed must not consume trial days.
update public.studios as studio
set trial_started_at = null,
    trial_ends_at = null
where studio.subscription_status = 'trialing'
  and studio.stripe_subscription_id is null
  and exists (
    select 1
    from public.profiles profile
    join auth.users account on account.id = profile.id
    where profile.studio_id = studio.id
      and (profile.is_owner = true or profile.role in ('admin', 'owner'))
      and account.email_confirmed_at is null
  )
  and not exists (
    select 1
    from public.profiles profile
    join auth.users account on account.id = profile.id
    where profile.studio_id = studio.id
      and account.email_confirmed_at is not null
  )
  and not exists (
    select 1
    from public.projects project
    where project.studio_id = studio.id
      and project.is_demo = false
  )
  and not exists (
    select 1
    from public.entries entry
    where entry.studio_id = studio.id
  )
  and not exists (
    select 1
    from public.expenses expense
    where expense.studio_id = studio.id
  );

create or replace function public.start_my_trial_if_needed()
returns table (
  started_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_studio_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from auth.users account
    where account.id = auth.uid()
      and account.email_confirmed_at is not null
  ) then
    raise exception 'Email confirmation required';
  end if;

  select profile.studio_id
  into target_studio_id
  from public.profiles profile
  where profile.id = auth.uid();

  if target_studio_id is null then
    raise exception 'Studio not found';
  end if;

  update public.studios as studio
  set trial_started_at = coalesce(studio.trial_started_at, now()),
      trial_ends_at = coalesce(studio.trial_ends_at, now() + interval '15 days')
  where studio.id = target_studio_id
    and studio.subscription_status = 'trialing'
    and studio.stripe_subscription_id is null;

  return query
  select studio.trial_started_at, studio.trial_ends_at
  from public.studios as studio
  where studio.id = target_studio_id;
end;
$$;

revoke all on function public.start_my_trial_if_needed() from public;
revoke all on function public.start_my_trial_if_needed() from anon;
grant execute on function public.start_my_trial_if_needed() to authenticated;
grant execute on function public.start_my_trial_if_needed() to service_role;

create or replace function public.claim_trial_lifecycle_emails(max_rows integer default 50)
returns table (
  log_id bigint,
  studio_id uuid,
  profile_id uuid,
  event_key text,
  recipient_email text,
  recipient_name text,
  studio_name text,
  days_left integer,
  unsubscribe_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.lifecycle_email_log as stale
  where stale.status = 'claimed'
    and stale.claimed_at < now() - interval '2 hours';

  return query
  with studio_activity as (
    select
      s.id as studio_id,
      s.name as studio_name,
      coalesce(s.trial_started_at, s.created_at) as created_at,
      s.trial_ends_at,
      owner_profile.id as profile_id,
      owner_profile.email as recipient_email,
      owner_profile.full_name as recipient_name,
      owner_profile.lifecycle_email_token as unsubscribe_token,
      coalesce(project_stats.project_count, 0) as project_count,
      coalesce(entry_stats.entry_count, 0) as entry_count,
      entry_stats.last_entry_at,
      greatest(
        0,
        ceil(extract(epoch from (s.trial_ends_at - now())) / 86400.0)::integer
      ) as days_left
    from public.studios s
    join lateral (
      select p.id, p.email, p.full_name, p.lifecycle_email_token
      from public.profiles p
      where p.studio_id = s.id
        and p.lifecycle_emails_enabled = true
        and p.email is not null
        and trim(p.email) <> ''
        and (p.is_owner = true or p.role in ('admin', 'owner'))
      order by p.is_owner desc nulls last, p.id
      limit 1
    ) owner_profile on true
    left join lateral (
      select count(*)::integer as project_count
      from public.projects pr
      where pr.studio_id = s.id
        and pr.is_demo = false
    ) project_stats on true
    left join lateral (
      select count(*)::integer as entry_count, max(e.created_at) as last_entry_at
      from public.entries e
      join public.projects pr on pr.id = e.project_id
      where e.studio_id = s.id
        and pr.is_demo = false
    ) entry_stats on true
    where s.subscription_status = 'trialing'
      and s.stripe_subscription_id is null
      and s.trial_ends_at is not null
  ),
  candidates as (
    select
      activity.*,
      rule.event_key,
      rule.priority
    from studio_activity activity
    cross join lateral (
      values
        ('trial_expired'::text, activity.trial_ends_at <= now(), 1),
        (
          'trial_1d'::text,
          activity.trial_ends_at > now()
            and activity.trial_ends_at <= now() + interval '1 day',
          2
        ),
        (
          'trial_3d'::text,
          activity.trial_ends_at > now() + interval '1 day'
            and activity.trial_ends_at <= now() + interval '3 days',
          3
        ),
        (
          'trial_7d'::text,
          activity.trial_ends_at > now() + interval '3 days'
            and activity.trial_ends_at <= now() + interval '7 days',
          4
        ),
        (
          'inactive_7d'::text,
          activity.created_at <= now() - interval '7 days'
            and activity.trial_ends_at > now() + interval '7 days'
            and activity.entry_count > 0
            and activity.last_entry_at <= now() - interval '7 days',
          5
        ),
        (
          'project_no_hours_48h'::text,
          activity.created_at <= now() - interval '48 hours'
            and activity.created_at > now() - interval '10 days'
            and activity.project_count > 0
            and activity.entry_count = 0,
          6
        ),
        (
          'no_project_24h'::text,
          activity.created_at <= now() - interval '24 hours'
            and activity.created_at > now() - interval '7 days'
            and activity.project_count = 0,
          7
        )
    ) rule(event_key, eligible, priority)
    where rule.eligible
  ),
  ranked_candidates as (
    select
      candidates.*,
      row_number() over (
        partition by candidates.studio_id
        order by candidates.priority, candidates.created_at
      ) as studio_priority
    from candidates
  ),
  selected_candidates as (
    select *
    from ranked_candidates
    where studio_priority = 1
    order by priority, created_at
    limit greatest(1, least(coalesce(max_rows, 50), 200))
  ),
  inserted as (
    insert into public.lifecycle_email_log (
      studio_id,
      profile_id,
      event_key,
      recipient_email,
      recipient_name,
      studio_name,
      days_left
    )
    select
      candidate.studio_id,
      candidate.profile_id,
      candidate.event_key,
      lower(trim(candidate.recipient_email)),
      candidate.recipient_name,
      candidate.studio_name,
      candidate.days_left
    from selected_candidates candidate
    on conflict on constraint lifecycle_email_log_studio_event_unique do nothing
    returning
      id,
      lifecycle_email_log.studio_id,
      lifecycle_email_log.profile_id,
      lifecycle_email_log.event_key,
      lifecycle_email_log.recipient_email,
      lifecycle_email_log.recipient_name,
      lifecycle_email_log.studio_name,
      lifecycle_email_log.days_left
  )
  select
    inserted.id,
    inserted.studio_id,
    inserted.profile_id,
    inserted.event_key,
    inserted.recipient_email,
    inserted.recipient_name,
    inserted.studio_name,
    inserted.days_left,
    profiles.lifecycle_email_token
  from inserted
  join public.profiles on profiles.id = inserted.profile_id;
end;
$$;

revoke all on function public.claim_trial_lifecycle_emails(integer) from public;
revoke all on function public.claim_trial_lifecycle_emails(integer) from anon;
revoke all on function public.claim_trial_lifecycle_emails(integer) from authenticated;
grant execute on function public.claim_trial_lifecycle_emails(integer) to service_role;

commit;
