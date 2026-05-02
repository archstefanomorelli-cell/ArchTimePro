# Produzione: dominio, email e Stripe live

Checklist da usare per il passaggio a `archtimepro.it`, email personalizzata e Stripe live.

## Dominio

- Dominio definitivo scelto: `archtimepro.it`.
- Decidere provider deploy definitivo:
  - GitHub Pages per continuità beta.
  - Cloudflare Pages consigliato per header, cache e gestione DNS più robusta.
- Collegare `archtimepro.it` al provider scelto.
- Attendere SSL attivo.
- Verificare:
  - `https://archtimepro.it/`
  - `https://archtimepro.it/app.html`
  - `https://archtimepro.it/privacy.html`
  - `https://archtimepro.it/termini.html`
  - `https://archtimepro.it/guida.html`
  - `https://archtimepro.it/feedback.html`
  - `https://archtimepro.it/sicurezza.html`

## Email

- Creare email prodotto, per esempio:
  - `support@archtimepro.it`
  - `privacy@archtimepro.it`
  - `billing@archtimepro.it`
- Aggiornare privacy e termini con email definitive.
- Configurare eventuale mittente Supabase Auth.
- Verificare deliverability email:
  - conferma registrazione, se abilitata;
  - reset password;
  - eventuali comunicazioni manuali.

## Supabase Auth

- Impostare Site URL:

```text
https://archtimepro.it
```

- Impostare redirect URL consentiti:

```text
https://archtimepro.it/app.html
https://archtimepro.it/app.html*
https://www.archtimepro.it/app.html
https://www.archtimepro.it/app.html*
```

- Verificare reset password su dominio definitivo.
- Decidere se abilitare conferma email.
- Rivedere template email in italiano.

## Stripe live

- Completare profilo business Stripe.
- Creare prodotto Starter live.
- Creare prezzo Starter live.
- Creare payment link Starter live.
- Creare prodotto Premium live.
- Creare prezzo Premium live.
- Creare payment link Premium live.
- Configurare Customer Portal live.
- Aggiornare GitHub Secrets:
  - `STRIPE_LINK_STARTER`
  - `STRIPE_LINK_PREMIUM`
  - `STRIPE_CUSTOMER_PORTAL`

## App production mode

- Rimuovere o sostituire il `robots.txt` beta che blocca l'indicizzazione.
- Rimuovere i meta `noindex, nofollow` dalle pagine pubbliche quando il dominio definitivo e i testi legali sono pronti.
- Modificare workflow GitHub Pages:

```js
environment: 'production'
```

- Verificare che i link Stripe non contengano `test_`.
- Eseguire deploy.
- Aprire `app.html` senza errori di configurazione.

## Test produzione controllata

- Creare account owner reale.
- Creare studio.
- Fare upgrade con pagamento live minimo/controllato.
- Verificare piano su Supabase.
- Aprire Customer Portal.
- Annullare abbonamento di test se necessario.
- Verificare email/fattura Stripe.

## Prima del lancio pubblico

- Privacy e termini validati.
- P.IVA/ragione sociale/indirizzo inseriti se necessari.
- Policy rimborso chiara.
- Backup Supabase verificato.
- QA mobile completato.
- Roadmap privacy economica confermata: prima del lancio commerciale decidere se attivare cifratura lato cliente per budget, costi, spese e margini, cosi da renderli non leggibili dal gestore tecnico del database.
