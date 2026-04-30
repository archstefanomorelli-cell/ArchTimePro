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
