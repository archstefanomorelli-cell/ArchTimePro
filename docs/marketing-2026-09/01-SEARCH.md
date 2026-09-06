# Campagna Search pronta da configurare

Stato: bozza locale, non creata nell'account. Data: 6 settembre 2026.

## Configurazione

| Campo | Valore proposto |
|---|---|
| Nome | ATP_Search_IT_Studi_Test01 |
| Tipo | Solo rete di ricerca Google |
| Stato iniziale | In pausa |
| Durata | 21 giorni dalla data approvata |
| Budget | Totale campagna 120 EUR; nessun rinnovo |
| Localita | Italia; presenza fisica o abituale, non semplice interesse |
| Lingua | Italiano |
| Reti aggiuntive | Partner di ricerca e Display disattivati |
| Offerta iniziale | Massimizza i clic, limite CPC 2 EUR da confermare nel Planner |
| Gruppo | Gestionale studi architettura |
| Conversione primaria | Registrazione effettivamente riuscita, una conversione per interazione |
| Espansioni | Niente broad match, AI Max o asset automatici non revisionati nel test |
| Applicazione automatica consigli | Disattivata per cambi di budget, targeting e annunci |

Il limite CPC è una scelta prudenziale, non una stima del mercato. Se rende il test quasi privo di traffico, non alzarlo automaticamente: presentare le stime e decidere se rinunciare o cambiare il test.

Google documenta il budget totale anche per Search. Verificarne la disponibilità nell'account e selezionarlo alla creazione. Se non disponibile, NON sostituirlo silenziosamente con un budget giornaliero: quest'ultimo non è un tetto rigido giornaliero e richiede un diverso controllo di spesa prima del via.

Fonte: [budget totali Google Ads](https://support.google.com/google-ads/answer/10486938?hl=it).

## Keyword iniziali

Due corrispondenze per ciascuna delle prime tre intenzioni, senza disperdere il budget su molti gruppi:

```text
[gestionale studio architettura]
"gestionale studio architettura"
[software gestione studio architettura]
"software gestione studio architettura"
[gestionale studio tecnico]
"gestionale studio tecnico"
[software gestione commesse architetti]
[controllo costi studio tecnico]
```

La corrispondenza esatta comprende varianti di significato: verificare i termini di ricerca realmente disponibili nel report. Il Planner deve confermare che ci sia domanda sufficiente; una keyword con volume troppo basso non giustifica l'ampliamento indiscriminato.

Esclusioni iniziali a frase:

```text
"offerte lavoro"
"cerco lavoro"
"stipendio"
"tesi"
"corso autocad"
"corso revit"
"download crack"
"torrent"
"software rendering"
"gestionale ristorante"
"gestionale magazzino"
```

Non escludere genericamente "gratis", "costi" o "preventivo": possono appartenere a ricerche pertinenti. Non comprare in questo test keyword di concorrenti, BIM generico o calcolo parcella, che richiedono un'offerta è una pagina diverse.

## Annuncio responsive

URL finale: https://www.archtimepro.it/gestionale-studio-architettura.html

Percorsi visualizzati: `studi` / `commesse`.

Titoli, massimo 30 caratteri ciascuno:

1. Arch Time Pro
2. Gestionale Per Architetti
3. Controlla Ore E Margini
4. Quanto Resta Del Compenso?
5. Costi Chiari Per Commessa
6. Dal Tempo Al Costo Reale
7. Prova Gratuita Di 15 Giorni
8. Per Studi Di Architettura
9. Il Budget Sotto Controllo
10. Traccia Il Lavoro Del Team
11. Scopri Dove Vanno Le Ore
12. Inizia Da Una Commessa

Descrizioni, massimo 90 caratteri ciascuna:

1. Ore, costi e margini delle commesse in un solo posto. Prova Arch Time Pro per 15 giorni.
2. Quanto resta del compenso? Confronta budget, ore del team e spese di ogni progetto.
3. Parti da una commessa. Registra il lavoro e scopri quanto costano le ore del team.
4. Per studi di architettura. Controlla il lavoro senza perdere di vista i costi.

Nessun prezzo nell'annuncio: evita che una modifica dei piani renda inesatto il messaggio. Confermare i 15 giorni sulla pagina prima di attivare. Non fissare titoli in posizione inizialmente.

[Specifiche annunci responsive](https://support.google.com/google-ads/answer/7684791).

## Asset aggiuntivi

| Sitelink | URL | Descrizione 1 | Descrizione 2 |
|---|---|---|---|
| Come Funziona | https://www.archtimepro.it/metodo.html | Dalle ore al costo di commessa | Guarda il metodo di lavoro |
| Prezzi | https://www.archtimepro.it/index.html#prezzi | Consulta il piano disponibile | Verifica condizioni e prova |
| Costo Orario Studio | https://www.archtimepro.it/calcolo-costo-orario-studio-professionale.html | Stima il costo delle tue ore | Usa il calcolatore gratuito |
| Chi Siamo | https://www.archtimepro.it/chi-siamo.html | Da dove nasce Arch Time Pro | Un progetto nato dal lavoro |

Callout: `Prova di 15 giorni`, `Ore e costi per progetto`, `Margini sotto controllo`.

## Tracciamento

Auto-tagging attivo. Suffisso URL finale:

```text
utm_source=google&utm_medium=cpc&utm_campaign=search_studi_test01&utm_content={creative}&utm_term={keyword}
```

Non inserire email, nomi o ID personali negli URL o negli eventi Analytics. Verificare che redirect e navigazione conservino l'attribuzione prevista, senza aggirare il consenso.

La conversione Ads già indicata nel progetto e `AW-18190596284/RCALCNbqsdIcELzx-eFD`. Va verificata nell'account, non ricreata automaticamente. Evitare di contare due volte lo stesso signup tramite tag Ads diretto e importazione GA4: una sola azione primaria, l'altra eventualmente secondaria.

Eventi diagnostici presenti nel codice: `first_project_created`, `first_time_entry`, `subscription_active`. Verificare ricezione e significato effettivo prima del via. L'ultimo NON sostituisce la verifica di un pagamento Stripe. Escludere test e account interni dalle valutazioni, usando aggregati e non inviando dati personali ad Analytics.

## Controlli e arresto

1. Prima del via: annuncio approvato, pagina corretta, registrazione test riuscita, conversione non duplicata, spesa totale configurata e fatturazione verificata.
2. Entro 40 EUR: controllare pertinenza dei termini disponibili, dispositivi, pagina di arrivo e percorso. Escludere solo ricerche chiaramente estranee.
3. A 80 EUR: se non ci sono registrazioni verificate, sospendere e controllare attrito e tracciamento prima di spendere il residuo. Non concludere automaticamente che il prodotto non interessa.
4. A 120 EUR o alla scadenza: stop. Valutare iscrizioni, primi progetti reali, prime ore, ritorni e pagamenti. Nessun aumento automatico.
5. A qualsiasi spesa: sospendere se registrazione, checkout, consenso o pagina si rompono. Un controllo automatico con ritardo non sostituisce il tetto configurato in piattaforma.

Attendiamo la maturazione della prova prima di giudicare i pagamenti. Con così pochi clic non fare test A/B simultanei ne promettere un CAC stabile.
