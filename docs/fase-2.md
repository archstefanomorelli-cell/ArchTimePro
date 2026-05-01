# Fase 2 - Configurazione ambiente e rilascio

Obiettivo: preparare Arch Time Pro per un deploy controllato, con configurazione separata per sviluppo e produzione.

Stato: avviata.

## Completato

- Aggiunto `environment` alla configurazione runtime.
- Aggiunto template `assets/js/00-runtime-config.example.js` per creare configurazioni di ambiente senza copiare valori locali.
- Aggiunto `.gitignore` per evitare di includere la configurazione runtime locale in futuri repository.
- Aggiunta validazione all'avvio per bloccare configurazioni incomplete o placeholder.
- Aggiunto controllo sui link Stripe test quando `environment` e impostato a `production`.
- Aggiunta checklist Supabase in `docs/supabase-checklist.md`.
- Rimossi handler inline residui dalle pagine pubbliche.
- Aggiunto `_headers` per header statici di sicurezza/cache dove supportato.
- Aggiunte guide `docs/deploy-statico.md` e `docs/qa-beta.md`.
- Aggiunta workflow GitHub Pages in `.github/workflows/pages.yml`.
- Aggiunto `.nojekyll` per pubblicazione statica corretta su GitHub Pages.
- Impostato il deploy GitHub Pages in modalita beta/test per consentire link Stripe test.
- Pubblicata beta su GitHub Pages con workflow verde.
- Verificato QA funzionale beta online: landing, login, configurazione studio, progetti, timer, registro, spese, margini, PDF, team, account e billing test.
- Rafforzate policy Supabase su `projects`, `entries`, `studios` e `profiles`.
- Rafforzate RPC Supabase delicate: `kick_user_from_studio`, `delete_user_account`, `create_studio_from_limbo`.
- Verificato bucket Storage `studio-logos` con upload/update admin-only.
- Aggiunto onboarding guidato owner/admin al primo accesso locale per identita e primo lavoro.
- Rimosso l'ultimo handler inline residuo dalla modale modifica attivita.

## Configurazione ambienti

### Sviluppo locale

Usare `assets/js/00-runtime-config.js` con:

```js
window.ARCH_TIME_CONFIG = {
    environment: 'development',
    supabaseUrl: 'https://...',
    supabaseKey: 'sb_publishable_...',
    stripeLinks: {
        starter: 'https://buy.stripe.com/test_...',
        premium: 'https://buy.stripe.com/test_...',
        customerPortal: 'https://billing.stripe.com/p/login/test_...'
    }
};
```

### Produzione

Creare `assets/js/00-runtime-config.js` partendo da `assets/js/00-runtime-config.example.js` e impostare:

- `environment: 'production'`
- Supabase project URL di produzione.
- Supabase publishable key di produzione.
- Link Stripe live per Starter, Premium e Customer Portal.

## Checklist pre-deploy

- Supabase Auth: URL del sito e redirect password reset configurati sul dominio finale.
- Supabase RLS: policy verificate su `profiles`, `studios`, `projects`, `entries`, `expenses`.
- Supabase Storage: bucket `studio-logos` e policy di upload/lettura verificate.
- Stripe: link live sostituiti ai link test.
- Stripe/Supabase: flusso piano Starter/Premium verificato con account reale di test.
- Dominio: `app.html`, `privacy.html`, `termini.html` e `guida.html` raggiungibili.
- Browser: smoke test su desktop e mobile.

## Prossimi passi

- Testare online onboarding guidato owner/admin dopo nuovo deploy GitHub Pages.
- Separare lato backend i dati economici da `entries`/`expenses` per impedire lettura API da staff.
- Preparare passaggio a produzione vera: Stripe live e `environment: 'production'`.
