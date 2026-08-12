begin;

alter table public.studios
add column if not exists currency text not null default 'EUR';

alter table public.studios
drop constraint if exists studios_currency_check;

alter table public.studios
add constraint studios_currency_check
check (currency in ('EUR', 'CHF'));

comment on column public.studios.currency is
'Valuta operativa dello studio usata per budget, costi, dashboard ed esportazioni. Non converte gli importi esistenti.';

commit;
