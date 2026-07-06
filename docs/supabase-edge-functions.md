# Supabase Edge Functions

## Invito collaboratori via email

Funzione:

```text
send-team-invite
```

La funzione riceve l'email del collaboratore dal frontend, verifica che l'utente autenticato sia admin/owner dello studio e invia una email con:

- link registrazione;
- codice invito team;
- nome dello spazio di lavoro.

## Secrets richiesti per invito collaboratori

La funzione `send-team-invite` usa SMTP Aruba direttamente dalla Edge Function. Impostare questi secrets nella Edge Function:

```text
APP_BASE_URL=https://www.archtimepro.it
SMTP_HOST=smtps.aruba.it
SMTP_PORT=465
SMTP_USER=info@archtimepro.it
SMTP_PASS=PASSWORD_CASELLA_ARUBA
SMTP_FROM_EMAIL=info@archtimepro.it
SMTP_FROM_NAME=Arch Time Pro
```

Supabase fornisce automaticamente:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Deploy

Con Supabase CLI:

```text
supabase functions deploy send-team-invite
```

Poi impostare i secrets:

```text
supabase secrets set APP_BASE_URL=https://www.archtimepro.it SMTP_HOST=smtps.aruba.it SMTP_PORT=465 SMTP_USER=info@archtimepro.it SMTP_FROM_EMAIL=info@archtimepro.it SMTP_FROM_NAME="Arch Time Pro"
```

Impostare `SMTP_PASS` dal terminale o dal dashboard Supabase senza salvarla nel repository.

## Nota sicurezza

La password SMTP non deve mai essere inserita in `app.html`, nei file `assets/js` o nei GitHub Secrets del sito statico.

## Notifica nuova registrazione studio/impresa

Funzione:

```text
notify-new-studio
```

La funzione riceve il payload del Database Webhook Supabase quando viene creato un record nella tabella `studios` e invia una notifica interna a `info@archtimepro.it`.

La notifica contiene solo dati minimi:

- nome studio/impresa;
- tipologia;
- id studio;
- data registrazione.

Non vengono inviati dati economici, progetti, attività o informazioni riservate.

## Secrets richiesti per notifica nuova registrazione

La funzione `notify-new-studio` puo usare lo stesso SMTP gia configurato per le email transazionali.

Con Brevo:

```text
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=LOGIN_SMTP_BREVO
SMTP_PASS=SMTP_KEY_BREVO
SMTP_FROM_EMAIL=info@archtimepro.it
SMTP_FROM_NAME=Arch Time Pro
NEW_STUDIO_NOTIFICATION_EMAIL=info@archtimepro.it
NEW_STUDIO_WEBHOOK_SECRET=UNA_PASSWORD_LUNGA_A_TUA_SCELTA
```

`NEW_STUDIO_WEBHOOK_SECRET` serve a proteggere la funzione: lo stesso valore va inserito negli header del webhook Supabase.

## Deploy notifica nuova registrazione

Con Supabase CLI:

```text
supabase functions deploy notify-new-studio
```

Poi impostare i secrets:

```text
supabase secrets set SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=587 SMTP_USER=LOGIN_SMTP_BREVO SMTP_FROM_EMAIL=info@archtimepro.it SMTP_FROM_NAME="Arch Time Pro" NEW_STUDIO_NOTIFICATION_EMAIL=info@archtimepro.it NEW_STUDIO_WEBHOOK_SECRET=UNA_PASSWORD_LUNGA_A_TUA_SCELTA
```

Impostare `SMTP_PASS` senza salvarla nel repository.

## Database Webhook per nuova registrazione

Nel dashboard Supabase:

```text
Database > Webhooks > Create a new hook
```

Impostazioni consigliate:

```text
Name: notify-new-studio
Table: public.studios
Events: Insert
Type: Supabase Edge Function
Edge Function: notify-new-studio
Method: POST
```

Header da aggiungere:

```text
x-archtime-webhook-secret: lo stesso valore di NEW_STUDIO_WEBHOOK_SECRET
```

Salvare il webhook e testare creando un nuovo studio/impresa da Arch Time Pro.

## Email Supabase Auth

Le email Auth di Supabase, cioe conferma registrazione e reset password, usano invece Brevo come SMTP transazionale.

Configurazione Supabase Auth SMTP:

```text
Sender email: info@archtimepro.it
Sender name: Arch Time Pro
Host: smtp-relay.brevo.com
Port: 587
Username: login SMTP Brevo
Password: SMTP key Brevo
```

Se nei log Supabase compare:

```text
525 5.7.1 Unauthorized IP address
```

controllare in Brevo la sezione sicurezza/IP autorizzati e disattivare il blocco IP oppure autorizzare l'IP usato da Supabase. Per Supabase e preferibile non dipendere da un singolo IP statico.

## Promemoria timer dopo 8 ore

Funzione:

```text
timer-reminder
```

La funzione cerca i profili con un timer attivo da almeno 8 ore e invia una sola
email al proprietario del timer. Non ferma automaticamente il timer.

Prima del deploy eseguire nel SQL Editor:

```text
docs/sql/timer-eight-hour-reminder.sql
```

La funzione riutilizza i secrets SMTP gia configurati:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM_EMAIL
SMTP_FROM_NAME
```

Aggiungere inoltre:

```text
APP_URL=https://www.archtimepro.it/app.html
TIMER_REMINDER_CRON_SECRET=UNA_PASSWORD_LUNGA_E_CASUALE
```

Deploy:

```text
supabase functions deploy timer-reminder --no-verify-jwt
```

Il flag `--no-verify-jwt` e necessario per permettere al Cron di chiamare la
funzione. La richiesta resta protetta dall'header segreto verificato dalla
funzione.

Nel Dashboard Supabase aprire:

```text
Integrations > Cron > Create job
```

Configurare:

```text
Name: timer-reminder-every-15-minutes
Schedule: */15 * * * *
Type: Supabase Edge Function
Function: timer-reminder
Method: POST
Header: x-timer-reminder-secret
Header value: lo stesso valore di TIMER_REMINDER_CRON_SECRET
```

Il job puo anche essere configurato con `pg_cron` e `pg_net`. Conservare sempre
il segreto in Supabase Vault e non inserirlo direttamente in uno script SQL
salvato nel repository.

### Verifica

Avviare un timer con un utente di prova, modificare temporaneamente
`active_timer_start` impostandolo a oltre 8 ore prima e avviare manualmente il
job Cron. Nei log della Edge Function la risposta deve contenere:

```json
{
  "ok": true,
  "eligible": 1,
  "sent": 1,
  "failed": 0
}
```

Una seconda esecuzione sullo stesso timer deve restituire `sent: 0`. Quando il
timer viene fermato o ne viene avviato uno nuovo,
`active_timer_reminder_sent_at` torna a `NULL`.

## Stripe webhook per Tariffa Fondatori

Funzione:

```text
stripe-webhook
```

La funzione riceve gli eventi Stripe, verifica la firma `Stripe-Signature` con `STRIPE_WEBHOOK_SECRET` e aggiorna `public.studios`.

Stati gestiti:

- `checkout.session.completed` -> `subscription_status = active`
- `customer.subscription.created` -> stato derivato dalla subscription Stripe
- `customer.subscription.updated` -> stato derivato dalla subscription Stripe
- `customer.subscription.deleted` -> `subscription_status = canceled`
- `invoice.payment_succeeded` -> `subscription_status = active`
- `invoice.payment_failed` -> `subscription_status = past_due`

Mappatura:

- Stripe `active` o `trialing` -> Supabase `active`
- Stripe `past_due` -> Supabase `past_due`
- Stripe `unpaid` -> Supabase `unpaid`
- Stripe `canceled` o `incomplete_expired` -> Supabase `canceled`
- Stripe `incomplete` -> Supabase `past_due`

Gli account omaggio si gestiscono manualmente con:

```sql
subscription_status = 'free'
plan_type = 'founder'
```

## Setup database Stripe

Prima di collegare Stripe, eseguire in Supabase SQL Editor:

```text
docs/sql/stripe-founder-billing.sql
```

## Deploy webhook Stripe

Con Supabase CLI:

```text
supabase functions deploy stripe-webhook --no-verify-jwt
```

Impostare i secrets dopo aver creato l'endpoint webhook su Stripe:

```text
supabase secrets set STRIPE_API_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Supabase fornisce automaticamente:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Endpoint da inserire in Stripe

Usare l'URL pubblico della Edge Function:

```text
https://PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Eventi Stripe da selezionare:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

Il Payment Link deve ricevere da Arch Time Pro il parametro:

```text
client_reference_id = studio_id
```

Il frontend lo aggiunge automaticamente quando manda l'owner su Stripe.
