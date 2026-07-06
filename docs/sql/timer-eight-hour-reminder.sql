-- Promemoria email per timer attivi da almeno 8 ore.
-- Eseguire una sola volta nel SQL Editor di Supabase.

alter table public.profiles
  add column if not exists active_timer_reminder_sent_at timestamptz;

comment on column public.profiles.active_timer_reminder_sent_at is
  'Data di invio del promemoria per il timer attualmente attivo. NULL per timer nuovi o non ancora notificati.';

