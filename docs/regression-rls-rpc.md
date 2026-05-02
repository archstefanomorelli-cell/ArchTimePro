# Regression test RLS/RPC

Checklist da eseguire dopo ogni modifica a policy Supabase, RPC o schema dati.

## Admin owner

- Login owner.
- Dashboard visibile.
- Progetti visibili.
- Budget e margini visibili.
- Registro attivita visibile.
- Costi visibili nel registro.
- Dettaglio progetto con spese e margini.
- PDF progetto.
- PDF cumulativo.
- PDF team.
- Creazione progetto.
- Modifica progetto.
- Archiviazione progetto.
- Aggiunta spesa.
- Eliminazione spesa.
- Inserimento timer.
- Inserimento manuale.
- Modifica voce registro.

## Staff

- Login staff.
- Progetti visibili.
- Timer funzionante.
- Inserimento manuale funzionante.
- Registro visibile.
- Nessun budget visibile.
- Nessun costo/rate visibile.
- Nessuna spesa visibile.
- Nessun report PDF visibile.
- Nessuna gestione team/catalogo/template visibile.

## API/RPC

Verificare che il frontend usi:

- `get_projects_for_app()`
- `get_entries_for_app()`
- `get_expenses_for_app()`
- `create_entry_for_app(...)`

Verificare che le select dirette siano strette:

- `projects_select`: admin only.
- `entries_select`: admin only.
- `expenses_select`: admin only.

Verificare che insert/update/delete siano coerenti:

- `entries_insert`: admin only per insert diretto.
- `create_entry_for_app`: disponibile ad authenticated e valida studio/progetto.
- `projects_insert/update/delete`: admin only.
- `expenses_insert/delete`: admin only.
- `studios_update`: admin only.
- `profiles_update/delete`: coerente con ruoli.

## Dati di test

- Almeno un owner/admin.
- Almeno uno staff.
- Almeno un progetto attivo.
- Almeno una voce timer.
- Almeno una voce manuale.
- Almeno una spesa.
- Almeno un progetto archiviato.

## Esito atteso

- Admin vede e gestisce tutto.
- Staff lavora senza vedere dati economici.
- Nessun errore console bloccante.
- Nessun dato cross-studio visibile.
- Timer/manuale creano entry con `rate` calcolato lato database.
