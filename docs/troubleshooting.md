# Troubleshooting operativo

Guida rapida per capire dove guardare quando qualcosa non funziona.

## App non si apre

Sintomo:

- Pagina bianca.
- Errore "Configurazione richiesta".

Controlli:

- Aprire console browser.
- Verificare `assets/js/00-runtime-config.js`.
- Controllare GitHub Secrets.
- Controllare workflow GitHub Pages.
- Usare un cache-buster:

```text
app.html?v=nuovo-numero
```

## Deploy non aggiornato

Controlli:

- GitHub Desktop: commit e push eseguiti.
- GitHub Actions: workflow verde.
- GitHub Pages: URL corretto.
- Browser cache: aprire in incognito o cambiare `?v=`.
- Controllare che `app.html` abbia versioni script aggiornate.

## Login non funziona

Controlli Supabase:

- Auth abilitato.
- Utente presente in Authentication.
- Profilo presente in `profiles`.
- Redirect URL corretti.
- Console browser per errori Supabase.

## Email Auth non arrivano

Sintomi:

- Utente creato ma resta `waiting for verification`.
- Reset password non arriva.
- Nei log Supabase compare `Error sending recovery email`.

Controlli:

- `Authentication -> Providers -> Email`: conferma email attiva solo se desiderata.
- `Authentication -> URL Configuration`: Site URL e Redirect URLs su `https://www.archtimepro.it`.
- `Authentication -> SMTP Settings`: Brevo configurato come SMTP transazionale.
- Verificare che in Brevo il sender `info@archtimepro.it` sia valido.
- Se il log contiene `525 5.7.1 Unauthorized IP address`, disattivare il blocco IP in Brevo o autorizzare l'IP indicato.

Nota:

- Gli inviti collaboratore usano la Edge Function `send-team-invite`.
- Conferma registrazione e reset password usano Supabase Auth SMTP.

## Utente in limbo

Sintomo:

- L'utente entra ma non vede dashboard completa.

Controlli:

- `profiles.studio_id` e `role`.
- Creazione studio via `create_studio_from_limbo`.
- Join con codice studio.

## Timer non salva

Controlli:

- RPC `create_entry_for_app` esiste.
- Policy `entries_insert` coerente.
- Progetto non archiviato.
- Profilo utente ha `studio_id`.
- `profiles.hourly_cost` valorizzato o gestito a zero.

## Staff vede dati sbagliati

Controlli:

- Frontend carica versione aggiornata JS.
- RPC attive:
  - `get_projects_for_app`
  - `get_entries_for_app`
  - `get_expenses_for_app`
- Select dirette di `projects`, `entries`, `expenses` strette agli admin.
- Test in finestra incognito con utente staff.

## Report PDF non funziona

Controlli:

- Piano utente.
- Librerie CDN `jspdf` e `jspdf-autotable`.
- Console browser.
- Dati presenti nel periodo selezionato.
- Logo remoto caricato correttamente se presente.

## Logo non si carica

Controlli:

- Bucket `studio-logos`.
- Policy upload/update admin-only.
- Bucket pubblico o URL leggibile.
- Dimensione e formato file.

## Stripe test/live

Errore:

- Link Stripe test in produzione.

Controlli:

- `environment` nella config generata.
- GitHub Secrets aggiornati.
- Link non contengono `test_`.
- Customer Portal corretto per ambiente live/test.

## Supabase SQL/RPC

Quando una modifica SQL rompe qualcosa:

- Controllare nome funzione e parametri.
- Controllare `security definer`.
- Controllare `set search_path = public`.
- Testare admin e staff.
- Se necessario, ripristinare policy precedente dai documenti.
