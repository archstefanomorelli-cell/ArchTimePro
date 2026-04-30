# Deploy statico

Arch Time Pro e una web app statica: puo essere pubblicata su GitHub Pages, Netlify, Cloudflare Pages, Vercel o hosting tradizionale.

## File da pubblicare

Pubblicare la root del progetto con:

- `index.html`
- `app.html`
- `guida.html`
- `privacy.html`
- `termini.html`
- `assets/`
- `.nojekyll`, per GitHub Pages
- `_headers`, se supportato dal provider

Non pubblicare documentazione interna se il provider non consente esclusioni semplici:

- `docs/`
- eventuali backup locali

## Configurazione produzione

Prima del deploy creare `assets/js/00-runtime-config.js` partendo da `assets/js/00-runtime-config.example.js`.

Valori richiesti:

- `environment: 'production'`
- Supabase URL produzione
- Supabase publishable key produzione
- link Stripe live, non test

L'app blocca l'avvio se trova placeholder o link Stripe test in produzione.

## Provider consigliati

### GitHub Pages

- Workflow pronta: `.github/workflows/pages.yml`
- Source: GitHub Actions
- Branch di deploy: `main`
- File pubblicati: cartella generata `dist`
- Config produzione: generata dai repository secrets
- Nota: GitHub Pages non applica `_headers`

Secrets richiesti nel repository GitHub:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `STRIPE_LINK_STARTER`
- `STRIPE_LINK_PREMIUM`
- `STRIPE_CUSTOMER_PORTAL`

Passi GitHub:

- Creare repository.
- Caricare i file del progetto.
- In Settings > Secrets and variables > Actions, aggiungere i secrets.
- In Settings > Pages, scegliere GitHub Actions come source.
- Fare push su `main` o avviare manualmente la workflow.

### Cloudflare Pages

- Build command: vuoto
- Output directory: `/`
- Headers: supporta `_headers`
- Buono per performance e SSL automatico

### Netlify

- Build command: vuoto
- Publish directory: `.`
- Headers: supporta `_headers`
- Buono per deploy manuali rapidi

### Vercel

- Framework preset: Other
- Build command: vuoto
- Output directory: `.`
- Richiede configurazione equivalente per header se si vuole replicare `_headers`

## Checklist deploy

- Config produzione compilata.
- Supabase Auth Site URL impostato sul dominio finale.
- Redirect password reset verso `https://dominio/app.html`.
- Link Stripe live inseriti.
- `privacy.html` e `termini.html` rivisti con dati legali definitivi.
- Smoke test completato su dominio pubblico.
