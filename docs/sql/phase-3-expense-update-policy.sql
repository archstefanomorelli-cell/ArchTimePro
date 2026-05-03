-- Phase 3 - allow admins to edit expenses in their own studio.
-- Run this in Supabase SQL Editor if editing an expense fails because of RLS.

drop policy if exists "expenses_update" on public.expenses;

create policy "expenses_update"
on public.expenses
for update
to authenticated
using (
  (studio_id = get_my_studio_id()) and is_admin()
)
with check (
  (studio_id = get_my_studio_id()) and is_admin()
);
