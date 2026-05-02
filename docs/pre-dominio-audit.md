# Audit pre-dominio

Data: 2026-05-02

Questo documento fotografa cosa è già pronto prima dell'acquisto del dominio e cosa resta bloccato da dominio, email personalizzata e Stripe live.

## Stato generale

Arch Time Pro è pronto per una beta controllata su GitHub Pages.

Sono presenti:

- app pubblicata come sito statico;
- runtime config generata da GitHub Secrets;
- Supabase collegato;
- RLS/RPC rafforzate per dati economici;
- onboarding owner;
- pagina feedback con salvataggio su Supabase;
- pagina sicurezza e privacy economica;
- privacy e termini in grafica coerente;
- noindex e robots beta;
- checklist QA, troubleshooting e lancio beta.

## Pagine pubbliche verificate

- `index.html`
- `app.html`
- `guida.html`
- `privacy.html`
- `termini.html`
- `feedback.html`
- `sicurezza.html`
- `robots.txt`

Tutte le pagine principali hanno meta:

```html
<meta name="robots" content="noindex, nofollow">
```

Il file `robots.txt` blocca l'indicizzazione della beta:

```text
User-agent: *
Disallow: /
```

## Deploy GitHub Pages

Il workflow copia nel pacchetto deploy:

- pagine HTML principali;
- `robots.txt`;
- `.nojekyll`;
- `assets/app.css`;
- `assets/js`;
- `mockup.png`;
- runtime config generata da Secrets.

La beta resta in:

```js
environment: 'development'
```

Questo consente l'uso di link Stripe test senza bloccare l'app.

## Feedback beta

La pagina `feedback.html` usa:

- `assets/js/00-runtime-config.js`;
- `assets/js/08-public-feedback.js`;
- tabella Supabase `beta_feedback`.

Lo script SQL richiesto è:

```text
docs/sql/phase-3-beta-feedback.sql
```

La policy è insert-only: i tester possono inviare feedback, ma non leggere la lista.

## Sicurezza economica

Stato attuale:

- staff senza budget, rate, spese e margini;
- letture filtrate tramite RPC;
- `entries` create tramite RPC dedicata;
- select dirette strette agli admin per tabelle economiche;
- comunicazione pubblica trasparente: beta protetta da RLS/RPC, cifratura economica lato cliente in roadmap.

Resta per produzione:

- progettare Privacy Economica Avanzata;
- decidere gestione chiavi;
- migrare eventuali campi economici sensibili.

## Cosa resta bloccato dal dominio

- Dominio definitivo.
- Email prodotto: support, privacy, billing.
- Supabase Auth Site URL definitivo.
- Redirect password reset definitivi.
- Stripe live Starter/Premium.
- Customer Portal live.
- Workflow in `environment: 'production'`.
- Rimozione `noindex` e sostituzione `robots.txt`.
- Privacy/termini validati con dati fiscali definitivi.

## Verifiche consigliate dopo il prossimo deploy

1. Aprire `robots.txt`.
2. Aprire `feedback.html?v=3`.
3. Inviare un feedback di prova.
4. Verificare riga in Supabase `beta_feedback`.
5. Aprire registrazione `app.html?v=7`.
6. Verificare link a Sicurezza e Privacy Economica.
7. Provare login admin.
8. Provare login staff.
9. Verificare che staff non veda costi e margini.
10. Aprire `sicurezza.html` e controllare i testi pubblici.

## Decisione

La Fase 3 pre-dominio può considerarsi pronta per beta controllata.

Il prossimo salto di maturità richiede dominio ed email personalizzata.
