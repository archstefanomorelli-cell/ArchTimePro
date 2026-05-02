# Produzione: dominio, email e Stripe live

Checklist da usare quando dominio e email personalizzata saranno disponibili.

## Dominio

- Scegliere dominio definitivo.
- Decidere provider deploy definitivo:
  - GitHub Pages per continuita beta.
  - Cloudflare Pages consigliato per header, cache e gestione DNS piu robusta.
- Collegare dominio al provider scelto.
- Attendere SSL attivo.
- Verificare:
  - `https://dominio/`
  - `https://dominio/app.html`
  - `https://dominio/privacy.html`
  - `https://dominio/termini.html`
  - `https://dominio/guida.html`

## Email

- Creare email prodotto, per esempio:
  - `support@dominio`
  - `privacy@dominio`
  - `billing@dominio`
- Aggiornare privacy e termini con email definitive.
- Configurare eventuale mittente Supabase Auth.
- Verificare deliverability email:
  - conferma registrazione, se abilitata;
  - reset password;
  - eventuali comunicazioni manuali.

## Supabase Auth

- Impostare Site URL:

```text
https://dominio
```

- Impostare redirect URL consentiti:

```text
https://dominio/app.html
https://dominio/app.html*
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
