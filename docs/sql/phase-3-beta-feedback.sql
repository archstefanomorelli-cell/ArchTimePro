-- Phase 3 - public beta feedback collection
-- Run this in Supabase SQL Editor before publishing the feedback form.

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  profile text,
  message text not null,
  page_url text,
  user_agent text,
  status text not null default 'new',
  priority text not null default 'untriaged',
  internal_notes text
);

alter table public.beta_feedback enable row level security;

drop policy if exists "beta_feedback_insert_public" on public.beta_feedback;

create policy "beta_feedback_insert_public"
on public.beta_feedback
for insert
to anon, authenticated
with check (
  length(trim(message)) between 10 and 3000
  and (name is null or length(trim(name)) <= 120)
  and (profile is null or length(trim(profile)) <= 80)
  and (page_url is null or length(trim(page_url)) <= 500)
  and (user_agent is null or length(trim(user_agent)) <= 500)
  and internal_notes is null
  and coalesce(status, 'new') = 'new'
  and coalesce(priority, 'untriaged') = 'untriaged'
  and (
    email is null
    or email = ''
    or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

grant usage on schema public to anon, authenticated;
revoke insert on public.beta_feedback from anon, authenticated;
grant insert (name, email, profile, message, page_url, user_agent)
on public.beta_feedback
to anon, authenticated;

comment on table public.beta_feedback is 'Public beta feedback submitted from feedback.html. Insert-only for public users; no public select policy.';
