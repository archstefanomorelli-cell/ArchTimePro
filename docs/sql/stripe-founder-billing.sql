begin;

alter table public.studios
add column if not exists subscription_status text default 'trialing';

alter table public.studios
add column if not exists plan_type text default 'founder';

alter table public.studios
add column if not exists stripe_customer_id text;

alter table public.studios
add column if not exists stripe_subscription_id text;

alter table public.studios
add column if not exists stripe_checkout_session_id text;

alter table public.studios
add column if not exists stripe_price_id text;

alter table public.studios
add column if not exists stripe_current_period_end timestamptz;

alter table public.studios
add column if not exists stripe_last_event_id text;

update public.studios
set subscription_status = 'trialing'
where subscription_status is null
   or trim(subscription_status) = '';

update public.studios
set plan_type = 'founder'
where plan_type is null
   or trim(plan_type) = ''
   or plan_type in ('starter', 'premium');

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'studios_subscription_status_check'
      and conrelid = 'public.studios'::regclass
  ) then
    alter table public.studios
    drop constraint studios_subscription_status_check;
  end if;
end $$;

alter table public.studios
add constraint studios_subscription_status_check
check (
  subscription_status in (
    'trialing',
    'active',
    'free',
    'past_due',
    'unpaid',
    'canceled',
    'inactive'
  )
);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'studios_plan_type_check'
      and conrelid = 'public.studios'::regclass
  ) then
    alter table public.studios
    drop constraint studios_plan_type_check;
  end if;
end $$;

alter table public.studios
add constraint studios_plan_type_check
check (plan_type in ('founder'));

create unique index if not exists studios_stripe_customer_id_uidx
on public.studios(stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists studios_stripe_subscription_id_uidx
on public.studios(stripe_subscription_id)
where stripe_subscription_id is not null;

create index if not exists studios_subscription_status_idx
on public.studios(subscription_status);

create index if not exists studios_plan_type_idx
on public.studios(plan_type);

commit;
