# Automazione invio email studi - Deliverability

Obiettivo: automatizzare l'outreach per Arch Time Pro senza "forzare" i filtri antispam. Non esiste un metodo garantito per arrivare sempre in inbox: si lavora su reputazione, autenticazione, qualita della lista, ritmo di invio e basso tasso di segnalazioni.

## Principio guida

Inviare poche email, molto pertinenti, da un dominio autenticato, con uscita semplice.

Per Arch Time Pro il primo obiettivo non e spedire 1.000 email, ma ottenere risposte reali da studi selezionati. La lista arricchita va usata come prospect list, non come newsletter list.

## Setup tecnico consigliato

### Dominio

Usare un sottodominio dedicato all'outreach, per esempio:

```text
hello.archtimepro.it
```

oppure:

```text
studio.archtimepro.it
```

Motivo: se l'outreach genera qualche segnalazione o bounce, protegge meglio il dominio principale `archtimepro.it`, usato per sito, app e comunicazioni operative.

### Casella mittente

Creare una casella reale, presidiata:

```text
nome@hello.archtimepro.it
```

Evitare mittenti impersonali tipo:

```text
noreply@
marketing@
newsletter@
```

### DNS obbligatori

Configurare:

```text
SPF
DKIM
DMARC
Return-Path / bounce domain
TLS
```

DMARC iniziale consigliato:

```text
v=DMARC1; p=none; rua=mailto:dmarc@archtimepro.it
```

Dopo alcune settimane senza problemi, passare gradualmente a policy piu forte:

```text
p=quarantine
```

poi eventualmente:

```text
p=reject
```

## Provider

Serve un provider che gestisca:

- autenticazione dominio;
- bounce;
- unsubscribe;
- rate limit;
- log degli invii;
- eventuali webhook per risposte/bounce.

Per una prima fase si puo usare una piattaforma di outreach/CRM con invio da casella reale. Per invii applicativi o transazionali vanno bene provider come Postmark/Mailgun/Resend, ma non bisogna usare canali transazionali per campagne promozionali se le policy del provider lo vietano.

## Ritmo di invio

Partire cosi:

```text
Settimana 1: 10 email totali
Settimana 2: 15-20 email totali
Settimana 3: 25-30 email totali
Settimana 4: massimo 40-50 email totali
```

Limite consigliato per Arch Time Pro in beta:

```text
max 10-15 email/giorno
max 3 giorni/settimana
```

Non inviare tutte alla stessa ora. Distribuire in finestre naturali:

```text
09:30-11:30
14:30-16:30
```

## Regole anti-spam pratiche

Evitare:

- link multipli nella prima email;
- immagini pesanti;
- allegati;
- parole aggressive tipo "gratis per sempre", "offerta imperdibile", "aumenta i profitti subito";
- oggetti troppo commerciali;
- HTML complicato;
- tracking aperture invasivo;
- invio a indirizzi generici non verificati in massa.

Preferire:

- testo semplice;
- un solo link alla landing;
- riferimento reale al progetto/studio;
- firma completa;
- frase di opt-out chiara;
- follow-up massimo 2.

## Template base per invio automatizzato

Oggetto:

```text
Arch Time Pro per controllare ore e margini di commessa
```

Email:

```text
Buongiorno {{Partner}},

ho visto il lavoro di {{Nome Studio}}, in particolare {{Progetto aggancio}}.

Sto aprendo la beta di Arch Time Pro, uno strumento pensato per studi tecnici che vogliono capire ore, costi e margini reali di ogni commessa senza introdurre un gestionale complesso.

Mi sembra potenzialmente vicino al vostro modo di lavorare per questo motivo: {{Angolo messaggio}}.

Durante la beta e gratuito. Mi interessa soprattutto capire se il flusso e utile per studi come il vostro.

Qui trova la pagina:
https://www.archtimepro.it/

Se le va, posso attivarle un accesso beta e raccogliere un feedback dopo qualche giorno di prova.

Se preferisce non ricevere altri messaggi da me su Arch Time Pro, me lo scriva pure e non la ricontatto.

Un saluto,
{{Firma}}
```

## Automazione consigliata

### Input

Usare:

```text
docs/batch-pilota-10-studi-architettura-2026-05.csv
```

Campi minimi:

```text
Nome Studio
Email contatto
Partner/Fondatori
Progetto aggancio
Angolo messaggio
Stato
Data invio 1
Data follow-up 1
Data follow-up 2
Risposta
Opt-out
Bounce
Note
```

### Sequenza

```text
Giorno 1: email iniziale
Giorno 5 lavorativo: follow-up 1, solo se nessuna risposta
Giorno 12 lavorativo: follow-up 2, chiusura gentile
Stop immediato: risposta, bounce, opt-out, richiesta di non essere ricontattati
```

### Logica

Pseudo-flusso:

```text
per ogni studio nel batch:
  se stato = pronto e opt-out != true e bounce != true:
    genera email personalizzata
    invia entro limite giornaliero
    salva message_id, data invio, stato

ogni giorno:
  controlla risposte
  controlla bounce
  aggiorna CRM
  pianifica follow-up solo se nessuna risposta
```

## Metriche soglia

Prima di scalare oltre 50 email/settimana:

```text
Bounce rate < 2%
Spam complaint rate idealmente 0%, comunque sotto 0.1%
Risposte positive o neutre > 5%
Opt-out basso e senza tono negativo
Nessun blocco/provider warning
```

Se una metrica peggiora, fermare gli invii e correggere lista/messaggio.

## Cosa posso automatizzare io nel progetto

1. Preparare il CRM CSV con stati e date.
2. Generare email personalizzate per ogni studio.
3. Preparare file `.eml` o bozze importabili.
4. Collegare un provider via API quando scelto.
5. Creare uno script di invio con rate limit.
6. Creare uno script di follow-up automatico.
7. Creare report settimanale su invii, risposte, bounce e prossime azioni.

## Cosa serve prima di inviare davvero

- Provider scelto.
- Casella mittente reale.
- DNS configurati e verificati.
- Firma mittente.
- Indirizzo fisico o dati identificativi minimi.
- Meccanismo opt-out.
- Conferma che la lista e le finalita siano compatibili con la tua base giuridica/privacy.

## Primo esperimento consigliato

Inviare manualmente o semi-automaticamente il primo batch da 10.

Solo dopo:

- verificare recapito;
- leggere le risposte;
- migliorare il copy;
- automatizzare follow-up e invii successivi.
