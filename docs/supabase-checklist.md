# Supabase checklist

Questa checklist fotografa cio che il frontend usa oggi. Prima del deploy va confrontata con il progetto Supabase di produzione.

## Tabelle richieste

### `profiles`

Campi usati dall'app:

- `id`
- `studio_id`
- `full_name`
- `email`
- `role`
- `is_owner`
- `hourly_cost`
- `active_timer_start`
- `active_timer_project`
- `active_timer_task`
- `active_timer_notes`

Operazioni frontend:

- `select`
- `update`
- `delete`

### `studios`

Campi usati dall'app:

- `id`
- `name`
- `plan_type`
- `subscription_status`
- `business_type`
- `logo_url`
- `activity_catalog`
- `project_templates`
- `demo_generated`

Operazioni frontend:

- `select`
- `update`

### `projects`

Campi usati dall'app:

- `id`
- `studio_id`
- `name`
- `client`
- `budget`
- `tasks`
- `is_archived`

Operazioni frontend:

- `select`
- `insert`
- `update`
- `delete`

### `entries`

Campi usati dall'app:

- `id`
- `studio_id`
- `project_id`
- `project_name`
- `task`
- `duration`
- `user_email`
- `user_name`
- `rate`
- `notes`
- `created_at`

Operazioni frontend:

- `select`
- `insert`
- `update`
- `delete`

### `expenses`

Campi usati dall'app:

- `id`
- `studio_id`
- `project_id`
- `description`
- `amount`
- `user_name`
- `created_at`

Operazioni frontend:

- `select`
- `insert`
- `delete`

## RPC richieste

- `create_studio_from_limbo(studio_name, b_type)`
- `delete_user_account()`
- `kick_user_from_studio(user_to_kick)`

## Storage richiesto

Bucket:

- `studio-logos`

Operazioni frontend:

- upload con `upsert: true`
- lettura URL pubblico con `getPublicUrl`

Percorso usato:

```text
{studio_id}/{timestamp}_{file.name}
```

## Policy RLS da verificare

- Un utente puo leggere solo dati del proprio `studio_id`.
- Un collaboratore staff puo leggere i dati necessari ma non vedere costi riservati se la policy backend lo richiede.
- Solo owner/admin possono modificare team, progetti, catalogo, template, spese e report finanziari.
- Le entry devono essere inseribili dall'utente autenticato nel proprio studio.
- Le entry devono essere modificabili/eliminabili solo da owner/admin, salvo decisione prodotto diversa.
- Il bucket `studio-logos` deve accettare upload solo da utenti autenticati del relativo studio.

## Stato verifica beta

Verificato su Supabase durante Fase 2:

- `profiles_select`: limitata a `studio_id = get_my_studio_id()`.
- `profiles_update`: aggiunto `WITH CHECK` coerente con utente corrente o admin dello studio.
- `profiles_delete`: limitata ad admin dello stesso studio.
- `projects_select`: limitata allo studio corrente.
- `projects_insert`: rafforzata con `is_admin()` e `studio_id = get_my_studio_id()`.
- `projects_update`: rafforzata con `is_admin()` in `USING` e `WITH CHECK`.
- `projects_delete`: limitata ad admin dello stesso studio.
- `entries_insert`: consente inserimento nello studio corrente.
- `entries_update`: rafforzata con `is_admin()` in `USING` e `WITH CHECK`.
- `entries_delete`: rafforzata via SQL Editor con `is_admin()` e studio corrente.
- `expenses_insert`: gia limitata ad admin dello stesso studio.
- `expenses_delete`: gia limitata ad admin dello stesso studio.
- `studios_select`: limitata a `id = get_my_studio_id()`.
- `studios_update`: aggiunto `WITH CHECK` coerente con admin dello studio corrente.
- `studio-logos`: bucket pubblico, upload/update admin-only.

## RPC rafforzate

Aggiornate durante Fase 2:

- `kick_user_from_studio(user_to_kick)`: ora richiede utente autenticato, admin, stesso studio, non consente auto-rimozione e non rimuove owner.
- `delete_user_account()`: ora impedisce a un owner con altri membri nello studio di eliminare l'account prima del trasferimento proprieta.
- `create_studio_from_limbo(studio_name, b_type)`: ora richiede utente autenticato, nome non vuoto, `b_type` valido e profilo senza studio.

## Stato sicurezza dati economici Fase 3

Verificato dopo deploy e test online:

- `get_projects_for_app()` attiva e usata dal frontend.
- `get_entries_for_app()` attiva e usata dal frontend.
- `get_expenses_for_app()` attiva e usata dal frontend.
- `create_entry_for_app(...)` attiva e usata dal frontend per timer e inserimento manuale.
- Admin verificato: dashboard, margini, dettaglio progetto, spese e PDF funzionanti.
- Staff verificato: login, progetti, timer, inserimento ore e registro funzionanti senza costi/margini visibili.
- Select dirette di `projects`, `entries`, `expenses` strette agli admin.
- Insert diretto in `entries` stretto agli admin dopo conferma RPC.

## Rischi residui backend

- Supabase RLS lavora per riga, non per colonna: la strategia attuale usa RPC per filtrare campi economici verso lo staff.
- Per produzione ad alta sicurezza resta consigliabile separare fisicamente i costi in tabelle admin-only.
- Ogni evoluzione di ruoli, piani o schema deve aggiornare anche le RPC Fase 3.

## Script Fase 3

Eseguito `docs/sql/phase-3-secure-data-access.sql`.

Lo script:

- crea `get_projects_for_app()`;
- crea `get_entries_for_app()`;
- crea `get_expenses_for_app()`;
- limita le select dirette di `projects`, `entries`, `expenses` agli admin dopo conferma deploy.

Eseguito anche `docs/sql/phase-3-create-entry-rpc.sql`.

Lo script:

- crea `create_entry_for_app(...)`;
- calcola `rate` lato database usando `profiles.hourly_cost`;
- ricava `project_name`, `user_name`, `user_email` lato database;
- consente poi di stringere `entries_insert` agli admin per impedire spoofing diretto dal client.

## Auth e redirect

- Site URL impostato sul dominio finale.
- Redirect password reset verso `app.html`.
- Email template verificati in italiano.
- Provider email/password abilitato.

## Controlli prima della beta

- Account owner nuovo crea studio correttamente.
- Utente invitato entra con codice studio.
- Owner trasferisce proprieta solo a utente corretto.
- Staff non accede a funzioni admin bloccate lato UI e lato RLS.
- Demo data crea progetto, ore e spese senza errori.
