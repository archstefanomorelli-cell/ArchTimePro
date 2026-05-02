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
- `guida.html`, `privacy.html`, `termini.html` sono raggiungibili. Verificato.
- Prezzi Starter/Premium sono leggibili su mobile. Da verificare su device reali.

## Onboarding

- Creazione account owner studio tecnico. Verificato.
- Creazione account owner impresa edile.
- Creazione/configurazione studio. Verificato.
- Join collaboratore con codice studio. Verificato.
- Reset password da email.

## Operativita

- Creazione lavoro/cantiere con budget. Verificato.
- Aggiunta attivita da catalogo. Verificato.
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

## Test Fase 3 eseguiti

- Onboarding guidato owner/admin: apertura una tantum, settore mostrato come scelta gia effettuata, salvataggio identita, preparazione primo lavoro e compilazione form progetto. Verificato.
- Timer e inserimento manuale dopo `create_entry_for_app`. Verificato admin/staff.

## Criterio uscita beta

- Nessun errore console bloccante.
- Nessun flusso core interrotto.
- Nessun dato cross-studio visibile.
- Nessun link test in produzione.
