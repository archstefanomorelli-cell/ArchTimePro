# Instagram launch samples

Questa cartella contiene i primi due campioni editoriali di Arch Time Pro. Non è collegata al sito pubblico.

Gli asset sono stati rigenerati il 13 settembre 2026 con la nuova identità visiva coordinata.

## Anteprima

- Carosello: `preview.html?type=carousel&slide=1`
- Reel 01, scoperta: `preview.html?type=reel-reach`
- Reel 02, prodotto: `preview.html?type=reel`

## Esportazione

Il renderer richiede Node.js e Playwright:

```powershell
node render-samples.js
```

Gli output vengono salvati in `output/`.

I Reel vengono esportati sia in WebM sia in MP4 H.264 compatibile con Instagram.
La tavola `carosello-01-anteprima-completa.png` mostra insieme tutte le sette slide.
