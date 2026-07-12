# Video guide Arch Time Pro

Questa cartella contiene clip registrate dalla UI reale di `app.html`, usando la modalita demo locale `?videoDemo=1`.

## Video generati

- `videos-real/01-dashboard-timer.webm`: dashboard, selezione progetto/attivita e avvio timer.
- `videos-real/02-nuovo-progetto.webm`: creazione progetto, template e attivita.
- `videos-real/03-budget-libero-somma-attivita.webm`: differenza tra budget libero e somma delle attivita.
- `videos-real/04-ore-manuali.webm`: inserimento manuale ore con orario inizio/fine.
- `videos-real/05-dettaglio-progetto.webm`: dettaglio progetto, ritmo e assorbimento.
- `videos-real/06-team-costi.webm`: team, costo orario e inviti collaboratori.
- `videos-real/07-analisi.webm`: dettaglio analisi finanziaria.

Le cinque clip ravvicinate usate nella pagina Metodo sono in `videos-method/`. Sono registrate a 560x420 con cursore visibile e senza testo incorporato; le didascalie restano nell'HTML della pagina per evitare sovrapposizioni.

## Frame di controllo

Gli screenshot di verifica sono in `frames-real/`.

## Rigenerazione

Da PowerShell, nella root del progetto:

```powershell
$env:NODE_PATH='C:\Users\moroz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\moroz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' docs/video-guide/capture-real-ui.js
& 'C:\Users\moroz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' docs/video-guide/record-real-ui.js
```

Per rigenerare soltanto le clip della pagina Metodo, imposta prima `ARCHTIME_METHOD_DEMOS=1`. Puoi limitare la registrazione a una singola clip con `ARCHTIME_METHOD_CLIP=01-`, sostituendo il numero desiderato.
