# Fase 3 - Hardening prodotto e produzione

Obiettivo: portare la beta pubblica verso una produzione commerciale piu robusta, con particolare attenzione a sicurezza dati, pagamenti live, compliance e feedback utenti.

Stato: avviata.

## Completato

- Ridotta l'esposizione accidentale lato client per utenti staff:
  - `projects` viene letto senza `budget`.
  - `entries` viene letto senza `rate`.
  - `expenses` non viene letto dallo staff.
- Preparato il frontend a usare RPC sicure con fallback client.
- Aggiunto script SQL `docs/sql/phase-3-secure-data-access.sql` per RPC sicure e lock-down delle select dirette.

## Sicurezza dati economici

### Stato attuale

La UI staff non mostra costi e margini. Dopo il primo hardening di Fase 3, il frontend staff non richiede piu budget, rate o spese.

### Rischio residuo

La protezione completa deve essere anche lato backend:

- Finche lo script SQL Fase 3 non viene eseguito, `entries_select` consente ancora righe dello stesso studio che contengono `rate`.
- Finche lo script SQL Fase 3 non viene eseguito, `expenses_select` consente ancora righe dello stesso studio che contengono importi.
- Finche lo script SQL Fase 3 non viene eseguito, `projects_select` consente ancora righe dello stesso studio che contengono `budget`.
- `entries_insert` riceve ancora `rate` dal frontend.

### Target produzione

- Eseguire `docs/sql/phase-3-secure-data-access.sql` in Supabase.
- Verificare staff/admin online dopo il deploy.
- Calcolare `rate` lato database o RPC, usando `hourly_cost` del profilo.
- Valutare separazione dei costi in tabella admin-only.

## Pagamenti live

- Creare link Stripe live Starter.
- Creare link Stripe live Premium.
- Creare Customer Portal live.
- Sostituire i GitHub Secrets.
- Impostare workflow Pages con `environment: 'production'`.
- Fare test end-to-end con pagamento reale controllato.

## Legal e compliance

- Rivedere `privacy.html` e `termini.html` con dati definitivi del titolare.
- Validare testi con consulente legale/commercialista.
- Verificare trattamento dati Supabase, Stripe e hosting GitHub Pages.
- Verificare email template Supabase.

## Feedback beta

- Raccogliere feedback da 3-5 utenti target.
- Prioritizzare bug bloccanti.
- Valutare miglioramenti UX su onboarding, dashboard, report e team.
