# Fase 1 - Stabilizzazione

Obiettivo: trasformare il prototipo monolitico in una base piu mantenibile, senza cambiare il comportamento dell'app.

Stato: completata.

## Completato

- Estratto lo stile da `app.html` in `assets/app.css`.
- Estratta la logica applicativa da `app.html` in `assets/app.js`.
- Suddivisa la logica in moduli caricati in sequenza da `app.html`:
  - `assets/js/00-runtime-config.js`
  - `assets/js/01-core.js`
  - `assets/js/02-auth-account.js`
  - `assets/js/03-team.js`
  - `assets/js/04-projects.js`
  - `assets/js/05-time-entries.js`
  - `assets/js/06-reports.js`
  - `assets/js/07-password-bootstrap.js`
- Corretto il mojibake visibile nei testi principali dell'app (`Attivita`, simbolo euro, accenti).
- Aggiunte utility `escapeHtml` e `escapeAttr` per ridurre l'iniezione HTML nei rendering principali.
- Applicato l'escape alle viste piu usate: progetti, registro attivita, team e dropdown principali.
- Separata la configurazione runtime di Supabase e Stripe in `assets/js/00-runtime-config.js`.
- Rimossi gli handler inline dal flusso login/signup principale e sostituiti con listener in `bindStaticEvents`.
- Rimossi tutti gli handler inline da `app.html`.
- Rimossi gli handler inline dai rendering dinamici principali e sostituiti con `data-ui-action` ed event delegation.
- Rafforzati i rendering di task, template, catalogo, registro, team e dettaglio lavoro con escape dei dati dinamici.
- Aggiunte utility `safeFileName` e `formatMoney` in `assets/js/01-core.js`.
- Aggiunti helper condivisi `optionHtml`, `emptyStateHtml` e `taskTagHtml` per ridurre rendering duplicati.
- Applicati gli helper condivisi a select di progetti, attività, template, team report e tag attività.
- Applicato `safeFileName` a export JSON e nomi file PDF.
- Scomposti i rendering complessi del dettaglio lavoro e del registro attivita in funzioni dedicate.
- Scomposti i rendering di team e modali report in helper dedicati.
- Scomposti i rendering di card progetto, task builder, catalogo/template e select del registro in helper dedicati.
- Verificata la sintassi dei moduli JavaScript con `node --check`.

## Esito

- Fase 1 chiusa: struttura, sicurezza base dei render, configurazione runtime e delega eventi sono stabilizzate.
- La checklist manuale resta come controllo rapido prima di ogni nuova fase.
- Prossimo fronte consigliato: Fase 2, configurazione ambiente/deploy e preparazione prodotto.

## Checklist test manuali

- Aprire `app.html` e verificare che la schermata login si carichi senza errori console.
- Login utente esistente.
- Creazione progetto/cantiere con budget e attivita.
- Avvio e stop timer con nota.
- Inserimento manuale ore.
- Modifica/eliminazione voce registro come admin.
- Apertura dettaglio progetto/cantiere e aggiunta spesa.
- Generazione report PDF progetto, report cumulativo e report team.
- Invito collaboratore e modifica ruolo/costo orario.
- Apertura account, cambio nome studio/impresa e logo.
