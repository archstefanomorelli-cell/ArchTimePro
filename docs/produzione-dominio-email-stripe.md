# Produzione: dominio, email e Stripe live

Checklist da usare per il passaggio a `www.archtimepro.it`, email personalizzata e Stripe live.

## Dominio

- Dominio definitivo scelto: `www.archtimepro.it`.
- Decidere provider deploy definitivo:
  - GitHub Pages per continuità beta.
  - Cloudflare Pages consigliato per header, cache e gestione DNS più robusta.
- `www.archtimepro.it` collegato a GitHub Pages.
- DNS check completato.
- Certificato HTTPS completato.
- `Enforce HTTPS` attivo.
- Verificare:
  - `https://www.archtimepro.it/`
  - `https://www.archtimepro.it/app.html`
  - `https://www.archtimepro.it/privacy.html`
  - `https://www.archtimepro.it/termini.html`
  - `https://www.archtimepro.it/guida.html`
  - `https://www.archtimepro.it/feedback.html`
  - `https://www.archtimepro.it/sicurezza.html`

## Email

- Email prodotto creata e configurata:
  - `info@archtimepro.it`
- Privacy e termini sono stati aggiornati con email definitiva.
- SMTP Supabase configurato con mittente `info@archtimepro.it`.
- Template Supabase Auth rifiniti in italiano per conferma registrazione e reset password.
- Verificare deliverability email in beta:
  - conferma registrazione;
  - reset password;
  - eventuali comunicazioni manuali.

## Supabase Auth

- Impostare Site URL:

```text
https://www.archtimepro.it
```

- Impostare redirect URL consentiti:

```text
https://www.archtimepro.it/app.html
https://www.archtimepro.it/app.html*
```

- Verificare reset password su dominio definitivo.
- Conferma email abilitata se confermata nel pannello Supabase.
- Template email in italiano rivisti.

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
