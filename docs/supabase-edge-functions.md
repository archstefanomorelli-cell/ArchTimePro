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
