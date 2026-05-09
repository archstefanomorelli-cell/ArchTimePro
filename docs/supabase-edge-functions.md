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
