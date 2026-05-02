# QA beta

Checklist minima prima di invitare utenti esterni.

Stato: ciclo funzionale online completato su GitHub Pages, incluso hardening RPC Fase 3.

## Browser e device

- Chrome desktop
- Safari desktop
- Chrome Android
- Safari iOS

## Marketing e accesso

- `index.html` si carica senza errori console. Verificato.
- CTA principali aprono `app.html`. Verificato.
- `guida.html`, `privacy.html`, `termini.html`, `feedback.html`, `sicurezza.html` sono raggiungibili. Verificato.
- Prezzi Starter/Premium sono leggibili su mobile. Da verificare su device reali.
- La pagina registrazione di `app.html` mostra link a Termini, Privacy e Sicurezza economica. Da verificare online dopo deploy.

## Onboarding

- Creazione account owner studio tecnico. Verificato.
- Creazione account owner impresa edile.
- Creazione/configurazione studio. Verificato.
- Join collaboratore con codice studio. Verificato.
- Reset password da email.

## Operativita

- Creazione lavoro/cantiere con budget. Verificato.
- Aggiunta attività da catalogo. Verificato.
- Creazione template Premium.
- Blocco template su Starter.
- Avvio/stop timer. Verificato.
- Inserimento ore manuale. Verificato.
- Modifica voce registro da admin. Verificato.
- Verifica vista staff senza dati economici riservati. Verificato lato UI.
- Verifica staff dopo RPC Fase 3. Verificato.

## Report e dati

- Dettaglio lavoro/cantiere. Verificato.
- Aggiunta/eliminazione spesa. Verificato.
- Margini aggiornati da spese. Verificato.
- PDF progetto Premium. Verificato.
- PDF cumulativo Premium. Verificato.
- PDF team Premium. Verificato.
- Export JSON account. Verificato.
- Letture admin dopo RPC Fase 3. Verificato.

## Team e account

- Invito/join collaboratore. Verificato.
- Modifica costo orario.
- Cambio ruolo staff/admin/inattivo.
- Trasferimento owner.
- Upload logo. Verificato.
- Cambio nome studio/impresa. Verificato.

## Piano e billing

- Upgrade Starter -> Premium / billing test. Verificato apertura link.
- Accesso Customer Portal. Verificato apertura link.
- Blocco funzioni Premium su Starter.

## Note prodotto emerse

- Dopo la prima registrazione owner serve onboarding guidato per configurare subito spazio di lavoro, settore e primo lavoro/cantiere.
- La protezione dei costi staff va rinforzata anche lato API, non solo lato UI.
- I tester temono che il gestore tecnico del database possa leggere dati economici: gestire con pagina sicurezza e roadmap Privacy Economica Avanzata.

## Test Fase 3 eseguiti

- Onboarding guidato owner/admin: apertura una tantum, settore mostrato come scelta già effettuata, salvataggio identità, preparazione primo lavoro e compilazione form progetto. Verificato.
- Timer e inserimento manuale dopo `create_entry_for_app`. Verificato admin/staff.
- Pagine pubbliche Fase 3: feedback e sicurezza aggiunte al workflow Pages. Da verificare online dopo deploy.
- Login/registrazione mobile: card più compatta, testo guida dinamico e link sicurezza visibile nella registrazione. Da verificare online dopo deploy.
- UI interna: verificare dashboard, timer, gestione progetti, team, modali di modifica e navigazione mobile dopo la rifinitura grafica.
- Dashboard economica: verificare colori KPI, stati utile/perdita e card "Attività più onerosa" su dati reali.
- Onboarding owner mobile: modale con scroll interno. Da verificare online dopo deploy.

## Criterio uscita beta

- Nessun errore console bloccante.
- Nessun flusso core interrotto.
- Nessun dato cross-studio visibile.
- Nessuna promessa privacy più forte della protezione realmente implementata.
- Nessun link test in produzione, quando si passa a dominio/email/Stripe live.
