-- Step 1 - table and platform admin guard

create table if not exists public.platform_studio_notes (
  studio_id uuid primary key references public.studios(id) on delete cascade,
  beta_status text not null default 'new',
  internal_notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.platform_studio_notes enable row level security;

alter table public.platform_studio_notes
drop constraint if exists platform_studio_notes_beta_status_check;

alter table public.platform_studio_notes
add constraint platform_studio_notes_beta_status_check
check (beta_status in ('new', 'active', 'follow_up', 'not_interested', 'convertible'));

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'info@archtimepro.it',
    'arch.morelli@estplatform.com'
  );
$function$;
