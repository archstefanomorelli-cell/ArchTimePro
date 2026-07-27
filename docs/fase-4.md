# Fase 4 - Progetti con prestazioni parametriche

## Flusso

- Il comando `Nuovo progetto` chiede se usare le attività dello studio o le prestazioni parametriche.
- Il percorso dello studio conserva template, catalogo e attività personalizzabili.
- Il percorso parametrico parte dal valore dell'opera, dalla categoria, dalla destinazione funzionale e dal grado di complessità.
- Il compenso di ogni prestazione è calcolato con `CP = V × G × Q × P`; per i coefficienti articolati per scaglioni viene applicata l'interpolazione prevista dalla libreria.
- Il compenso complessivo sostituisce il budget manuale del progetto.
- Il valore salvato è il compenso `CP`; spese, oneri accessori ed eventuale maggiorazione BIM restano esclusi e sono dichiarati nell'interfaccia.
- La somma dei compensi delle prestazioni di ogni fase alimenta automaticamente il piano costi della relativa macrofase.
- Le 105 prestazioni sono organizzate in dieci macrofasi operative.
- Per le prestazioni urbanistiche `Qa.0.01` e `Qa.0.02` viene richiesto anche il numero di abitanti.
- Le prestazioni selezionate vengono salvate nel progetto con codice, descrizione, macrofase e versione della libreria.
- Timer, registro e analisi usano soltanto le macrofasi che contengono almeno una prestazione selezionata.
- Nel dettaglio del progetto, sotto ogni macrofase, restano visibili le prestazioni selezionate.
- Una macrofase con ore già registrate non può essere rimossa durante la modifica.

## Riferimenti e dati

- Riferimento mostrato nell'app: `D.M. 17 giugno 2016 e D.Lgs. 36/2023, Allegato I.13`.
- Libreria operativa: `assets/data/normative-services-dlgs36.json`.
- Parametri Z-1/Z-2 e coefficienti di calcolo: `assets/data/normative-calculation-dlgs36.json`.
- La libreria contiene 6 macrofasi e 87 prestazioni con codice.
- La futura pagina pubblica di calcolo potrà usare la stessa libreria, salvare il calcolo completo in `normative_data` e importarlo nell'app.

## Supabase

Prima di creare un progetto parametrico eseguire:

`docs/sql/phase-4-normative-projects.sql`

Lo script aggiunge:

- `projects.project_setup_type`
- `projects.normative_data`
- la versione aggiornata di `get_projects_for_app()`
