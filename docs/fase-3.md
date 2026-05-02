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
- Preparato `create_entry_for_app` per calcolare `rate` lato database durante inserimento ore.
- Aggiunto script SQL `docs/sql/phase-3-create-entry-rpc.sql`.
- Eseguiti gli script SQL Fase 3 in Supabase.
- Verificato online admin dopo hardening RPC: progetti, dashboard, registro, dettaglio, spese e PDF funzionanti.
- Verificato online staff dopo hardening RPC: login, progetti, timer, inserimento ore e registro funzionanti senza costi/margini visibili.
- Verificato timer e inserimento manuale dopo `create_entry_for_app` per admin e staff.
- Rifinita visualizzazione fasce orarie nel registro attivita in formato compatto `HH:MM - HH:MM`.
- Aggiunto beta feedback kit in `docs/beta-feedback-kit.md`.
- Aggiunta checklist produzione dominio/email/Stripe in `docs/produzione-dominio-email-stripe.md`.
- Aggiunta guida troubleshooting in `docs/troubleshooting.md`.
- Aggiunta checklist regression RLS/RPC in `docs/regression-rls-rpc.md`.
- Aggiunta pagina pubblica `sicurezza.html` per spiegare sicurezza beta e roadmap Privacy Economica Avanzata.
- Aggiunto documento tecnico `docs/privacy-economica-avanzata.md`.
- Aggiunto link a Sicurezza e Privacy Economica nella registrazione app.
- Aggiunta checklist lancio beta controllata in `docs/beta-launch-checklist.md`.
- Aggiunto registro feedback beta in `docs/beta-feedback-log.md`.

## Sicurezza dati economici

### Stato attuale

La UI staff non mostra costi e margini. Dopo il primo hardening di Fase 3, il frontend staff non richiede piu budget, rate o spese.

Nota beta aggiornata:

- Durante la beta i dati economici sono protetti tra utenti, ruoli e studi tramite Supabase RLS, RPC dedicate e controlli applicativi.
- Questa protezione impedisce ai tester e ai collaboratori di vedere dati non autorizzati, ma non e ancora una cifratura end-to-end dei valori economici.
- Prima del lancio commerciale e prevista una "Privacy Economica Avanzata" con cifratura lato cliente dei campi sensibili, in modo che budget, costi, spese e margini siano illeggibili anche al gestore tecnico del database.

### Stato backend dopo test

- `get_projects_for_app()` fornisce dati filtrati: budget solo admin.
- `get_entries_for_app()` fornisce dati filtrati: rate solo admin, staff solo proprie entry.
- `get_expenses_for_app()` fornisce spese solo admin.
- `create_entry_for_app(...)` crea ore calcolando `rate` lato database.
- Le select dirette di `projects`, `entries`, `expenses` sono state strette agli admin.
- L'inserimento diretto in `entries` e stato stretto agli admin dopo conferma del funzionamento RPC.

### Rischio residuo

- La sicurezza economica ora passa da RPC e policy piu restrittive; resta consigliata una futura separazione fisica dei costi in tabella admin-only per una difesa ancora piu netta.
- Le funzioni RPC vanno mantenute sotto controllo quando evolvono schema, piani o ruoli.

### Target produzione

- Valutare separazione dei costi in tabella admin-only come hardening futuro.
- Aggiungere una checklist di regression test dopo ogni modifica RLS/RPC.

## Pagamenti live

- Creare link Stripe live Starter.
- Creare link Stripe live Premium.
- Creare Customer Portal live.
- Sostituire i GitHub Secrets.
- Impostare workflow Pages con `environment: 'production'`.
- Fare test end-to-end con pagamento reale controllato.

## Legal e compliance

- Riscritte `privacy.html` e `termini.html` con grafica coerente a landing/guida e testi beta piu completi.
- Rivedere `privacy.html` e `termini.html` con dati definitivi del titolare.
- Validare testi con consulente legale/commercialista.
- Verificare trattamento dati Supabase, Stripe e hosting GitHub Pages.
- Verificare email template Supabase.

## Feedback beta

- Raccogliere feedback da 3-5 utenti target.
- Prioritizzare bug bloccanti.
- Valutare miglioramenti UX su onboarding, dashboard, report e team.
- Usare `docs/beta-launch-checklist.md` per inviti, classificazione feedback e criteri di passaggio allo step successivo.
- Usare `docs/beta-feedback-log.md` per consolidare evidenze, priorità e decisioni.

## Stato pre-dominio

Tutto cio che non dipende da dominio, email personalizzata e Stripe live e stato preparato:

- beta online funzionante;
- sicurezza dati economici rafforzata;
- documentazione QA e troubleshooting pronta;
- kit feedback tester pronto;
- checklist produzione pronta.

Restano bloccati dal dominio/email:

- Stripe live;
- email mittente definitiva;
- redirect Supabase definitivi;
- validazione finale privacy/termini con dati fiscali definitivi.
