# Privacy Economica Avanzata

Obiettivo: rendere budget, costi, spese e margini non leggibili dal gestore tecnico del database prima del lancio commerciale.

## Stato beta

Oggi Arch Time Pro protegge i dati economici tramite:

- Supabase Row Level Security tra studi diversi.
- RPC dedicate per filtrare i dati restituiti al frontend.
- Ruoli owner/admin/staff.
- UI staff senza budget, costi, spese e margini.

Questa protezione e adatta alla beta, ma non equivale a cifratura end-to-end: chi gestisce il database potrebbe teoricamente leggere valori salvati in chiaro.

## Target prodotto

Implementare cifratura lato cliente per i campi economici sensibili:

- budget progetto;
- costo orario collaboratori;
- rate delle entry;
- spese;
- eventuali totali economici persistiti;
- dati economici nei report salvati.

I valori devono essere cifrati nel browser prima di essere inviati a Supabase. Il database deve ricevere solo payload cifrati.

## Principio tecnico

```text
utente inserisce budget -> browser cifra -> Supabase salva ciphertext
Supabase restituisce ciphertext -> browser decifra -> utente autorizzato vede il valore
```

Il server non deve ricevere la chiave in chiaro.

## Decisioni da prendere

- Chiave per studio o per singolo utente.
- Recupero in caso di password persa.
- Condivisione chiave tra owner e admin.
- Rotazione chiave quando un admin lascia lo studio.
- Compatibilita con report PDF.
- Compatibilita con dashboard e calcoli margini.
- Migrazione dei dati beta gia presenti.

## Architettura consigliata

### Chiave studio

Una chiave economica per ogni studio, accessibile solo agli owner/admin autorizzati.

Vantaggi:

- calcoli e report coerenti tra admin;
- gestione piu semplice rispetto a una chiave per ogni singolo dato;
- onboarding piu comprensibile per il cliente.

### Staff

Gli utenti staff non ricevono la chiave economica. Possono registrare ore e attivita, ma non decifrare valori economici.

### Campi cifrati

Invece di sovrascrivere subito le colonne esistenti, prevedere colonne parallele:

```text
budget_encrypted
hourly_cost_encrypted
amount_encrypted
rate_encrypted
```

Le colonne numeriche in chiaro possono essere rimosse o lasciate solo durante migrazione controllata.

## Rischi da progettare bene

- Se la chiave viene persa, i dati economici non sono recuperabili.
- Se un admin malevolo esporta dati mentre ha accesso, la cifratura non puo impedirlo.
- I calcoli lato database sui valori cifrati non sono possibili senza decifrare.
- La ricerca e gli ordinamenti sui valori economici cifrati richiedono strategie dedicate.

## Fasi operative

1. Mappare tutti i campi economici usati da app, report e RPC.
2. Spostare i calcoli economici sensibili nel browser per owner/admin.
3. Aggiungere modulo crypto lato client con Web Crypto API.
4. Aggiungere gestione chiave studio.
5. Migrare un solo campo pilota, per esempio `projects.budget`.
6. Estendere a costi orari, spese e rate.
7. Aggiornare privacy, termini e pagina sicurezza.
8. Eseguire test perdita chiave, invito admin, rimozione admin e export.

## Messaggio commerciale corretto

Da usare solo dopo implementazione e test:

```text
I valori economici sensibili vengono cifrati nel tuo browser prima di essere salvati. Arch Time Pro gestisce la piattaforma, ma non puo leggere budget, costi, spese e margini del tuo studio.
```
