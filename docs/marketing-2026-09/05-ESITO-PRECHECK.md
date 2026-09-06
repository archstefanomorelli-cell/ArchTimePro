# Precontrollo Search: 6 settembre 2026

## Decisione

Non attivare ancora la campagna. Il test originario richiede una selezione keyword rivista e la verifica end-to-end della conversione. Nessun annuncio creato o attivato e nessuna spesa sostenuta da queste operazioni. Creato soltanto un piano nel Keyword Planner (1436065857).

## Dati osservati nell'account

Fonte: interfaccia Google Ads di Arch Time Pro, Keyword Planner. Italia, Google, ultimi 12 mesi. Nella ricerca delle idee lingua Italiano; nella prima tabella storica del piano il selettore indica Tutte le lingue. Intervalli, non conteggi esatti. Le fasce di offerta indicano la parte superiore della pagina, NON il CPC che pagheremo.

| Ricerca | Ricerche mensili | Offerta bassa | Offerta alta |
|---|---:|---:|---:|
| gestionale studio tecnico | 10-100 | 1,02 EUR | 2,89 EUR |
| software studio tecnico | 10-100 | 0,70 EUR | 2,09 EUR |
| software gestione commesse | 100-1.000 | 2,76 EUR | 6,49 EUR |
| gestione commesse | 100-1.000 | 2,83 EUR | 6,98 EUR |
| software gestione commesse gratis | 10-100 | 1,08 EUR | 2,94 EUR |

Nessuna metrica fornita nella tabella iniziale per controllo costi studio tecnico, gestionale studio architettura, software gestione commesse architetti e software gestione studio architettura. Il trattino non significa necessariamente zero ricerche.

Non sommare varianti o intervalli come se rappresentassero pubblici distinti. La previsione iniziale proponeva ottobre, budget giornaliero 10 EUR e massimizza conversioni, senza dati utili: non rappresenta il nostro test. E stata cambiata la strategia del SOLO piano in massimizza clic, ma non e stata validata una previsione finale a 120 EUR per 21 giorni. Nessuna stima di clienti deriva da queste schermate.

## Interpretazione

La bozza iniziale era troppo specifica per avere evidenza sufficiente di domanda. Le due ricerche sugli studi tecnici sono candidate al primo test; software studio tecnico richiede attenzione alle intenzioni CAD/BIM, che il prodotto non soddisfa. La ricerca software gestione commesse ha piu domanda ma include altri settori ed e piu competitiva: non inserirla automaticamente solo per aumentare il traffico. Il limite CPC di 2 EUR non e stato validato come sufficiente a erogare il budget.

## Pagina pubblica

Verificata in Chrome la pagina gestionale-studio-architettura.html. Presente la dicitura Prova 15 giorni gratis: la vecchia versione da 30 giorni restituita dal motore web era non aggiornata rispetto alla pagina osservata.

Il pulsante principale della hero e Calcola il margine; il collegamento diretto alla prova si trova nella navigazione e in fondo. Per una campagna che promette il gestionale, proporre come azione principale la prova diretta, lasciando il calcolo come alternativa. Nessuna modifica al sito effettuata in questo controllo. Verifica visuale mobile e nuova registrazione completa non eseguite.

## Conversioni

Nell'account esiste una sola conversione principale di registrazione, origine sito web: Registrazione Arch Time Pro. Stato Configurazione errata; dettaglio: Conversion has never received data. La schermata mostra 0 campagne su 0 e 0 conversioni.

Questo NON dimostra da solo un malfunzionamento, ne assenza di iscrizioni organiche. Nel codice locale la conversione AW-18190596284/RCALCNbqsdIcELzx-eFD viene chiamata dopo signup riuscito per il titolare, non per lo staff, e solo con consenso. Viene emessa prima della conferma email: misura la richiesta di registrazione riuscita, non uno studio attivato o pagante.

Il codice mantiene ad_storage, ad_user_data e ad_personalization negati anche quando si accettano le statistiche. Non cambiare questi valori automaticamente: il test deve verificare il comportamento consentito, senza ampliare il consenso o presumere piena attribuzione pubblicitaria.

## Passi necessari prima del via

1. Test con Tag Assistant di una registrazione autorizzata, con email di prova controllata, per verificare ricezione del singolo evento e consenso; non generare una conversione falsa chiamando manualmente il tag.
2. Verificare anche il rifiuto del consenso e il percorso su mobile.
3. Rendere coerente il pulsante principale della landing con l'annuncio, dopo revisione della modifica.
4. Completare la previsione del gruppo rivisto, con periodo e budget effettivi; decidere se bastano i dati a giustificare 120 EUR.
5. Soltanto dopo, configurare la campagna con tetto e date, senza aumento o rinnovo automatico.
