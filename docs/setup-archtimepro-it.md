# Setup dominio www.archtimepro.it

Guida operativa da usare appena il dominio `www.archtimepro.it` risulta attivo e i DNS sono modificabili.

## Obiettivo

Collegare la beta GitHub Pages al dominio canonico:

```text
https://www.archtimepro.it
```

e preparare lo step successivo con email prodotto, Supabase Auth e Stripe live.

## 1. Verifica dominio

Nel pannello del provider controllare:

- dominio registrato e attivo;
- gestione DNS disponibile;
- possibilità di creare record `A`, `AAAA`, `CNAME` e/o record email;
- eventuale email inclusa o acquistabile.

## 2. GitHub Pages

Nel repository GitHub:

1. Aprire `Settings`.
2. Aprire `Pages`.
3. In `Custom domain`, inserire:

```text
www.archtimepro.it
```

4. Salvare.
5. Attendere che GitHub mostri i record DNS richiesti.
6. Abilitare `Enforce HTTPS` appena disponibile.

GitHub può creare o richiedere anche un file `CNAME` con:

```text
www.archtimepro.it
```

Se GitHub lo richiede, aggiungerlo nella root del progetto e includerlo nel workflow Pages.

## 3. DNS dominio

Nel provider dominio configurare i record indicati da GitHub Pages.

Per `www.archtimepro.it`, GitHub Pages usa normalmente un record `CNAME` sul sottodominio `www`.

Configurazione tipica:

```text
www                 CNAME  valore indicato da GitHub Pages
```

Nota: usare sempre i valori mostrati da GitHub nel pannello Pages, se diversi.

Opzionale: configurare anche `archtimepro.it` senza `www` come redirect verso `https://www.archtimepro.it`, se il provider dominio lo permette.

## 4. Verifica propagazione

Dopo la modifica DNS attendere da pochi minuti a qualche ora.

Verificare:

```text
https://www.archtimepro.it/
https://www.archtimepro.it/app.html
https://www.archtimepro.it/feedback.html
https://www.archtimepro.it/sicurezza.html
https://www.archtimepro.it/robots.txt
```

Per ora `robots.txt` e `noindex` restano attivi finché la produzione non è pronta.

## 5. Supabase Auth

Quando il dominio risponde correttamente:

Impostare Site URL:

```text
https://www.archtimepro.it
```

Impostare redirect URL consentiti:

```text
https://www.archtimepro.it/app.html
https://www.archtimepro.it/app.html*
```

Poi testare:

- login;
- logout;
- reset password;
- registrazione nuovo account.

## 6. Email prodotto

Email prodotto attiva:

```text
info@archtimepro.it
```

Privacy e termini sono stati aggiornati usando `info@archtimepro.it`.

## 7. Prima di Stripe live

Non passare ancora a Stripe live finché non sono pronti:

- dominio attivo in HTTPS;
- email prodotto funzionante;
- Supabase Auth configurato sul dominio;
- privacy/termini aggiornati;
- test login/reset completati.

## 8. Prima del lancio pubblico

Solo quando tutto è pronto:

- rimuovere `noindex, nofollow`;
- sostituire `robots.txt`;
- passare workflow a `environment: 'production'`;
- usare link Stripe live;
- validare testi legali definitivi.
