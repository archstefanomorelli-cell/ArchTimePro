# Setup dominio archtimepro.it

Guida operativa da usare appena il dominio `archtimepro.it` risulta attivo e i DNS sono modificabili.

## Obiettivo

Collegare la beta GitHub Pages al dominio:

```text
https://archtimepro.it
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
archtimepro.it
```

4. Salvare.
5. Attendere che GitHub mostri i record DNS richiesti.
6. Abilitare `Enforce HTTPS` appena disponibile.

GitHub può creare o richiedere anche un file `CNAME` con:

```text
archtimepro.it
```

Se GitHub lo richiede, aggiungerlo nella root del progetto e includerlo nel workflow Pages.

## 3. DNS dominio

Nel provider dominio configurare i record indicati da GitHub Pages.

Per dominio apex (`archtimepro.it`) GitHub Pages di solito richiede record `A` verso gli IP GitHub Pages e un eventuale `CNAME` per `www`.

Configurazione tipica:

```text
archtimepro.it      A      185.199.108.153
archtimepro.it      A      185.199.109.153
archtimepro.it      A      185.199.110.153
archtimepro.it      A      185.199.111.153
www                 CNAME  TUO-UTENTE.github.io
```

Nota: usare sempre i valori mostrati da GitHub nel pannello Pages, se diversi.

## 4. Verifica propagazione

Dopo la modifica DNS attendere da pochi minuti a qualche ora.

Verificare:

```text
https://archtimepro.it/
https://archtimepro.it/app.html
https://archtimepro.it/feedback.html
https://archtimepro.it/sicurezza.html
https://archtimepro.it/robots.txt
```

Per ora `robots.txt` e `noindex` restano attivi finché la produzione non è pronta.

## 5. Supabase Auth

Quando il dominio risponde correttamente:

Impostare Site URL:

```text
https://archtimepro.it
```

Impostare redirect URL consentiti:

```text
https://archtimepro.it/app.html
https://archtimepro.it/app.html*
https://www.archtimepro.it/app.html
https://www.archtimepro.it/app.html*
```

Poi testare:

- login;
- logout;
- reset password;
- registrazione nuovo account.

## 6. Email prodotto

Creare almeno:

```text
support@archtimepro.it
privacy@archtimepro.it
```

Opzionale:

```text
billing@archtimepro.it
info@archtimepro.it
```

Aggiornare privacy e termini sostituendo l'email personale quando le caselle sono attive.

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
