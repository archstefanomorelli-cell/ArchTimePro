begin;

alter table public.studios
add column if not exists quote_settings jsonb not null
default '{"version":1,"configured":false}'::jsonb;

comment on column public.studios.quote_settings is
'Configurazione intestazione e calcolo fiscale usata esclusivamente per i preventivi PDF.';

commit;
