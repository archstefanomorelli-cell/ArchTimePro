# Pubblicazione Microsoft Store

Il comando seguente crea un pacchetto MSIX non firmato, destinato al caricamento in Partner Center:

```powershell
npm run build:store
```

Il file viene salvato in `store-output/ArchTimeMiniTimer_0.2.4.0_x64.msix`.

La stessa procedura viene eseguita automaticamente dal workflow GitHub del timer, che pubblica il file tra gli artifact della build. Per compilare in locale servono i Visual Studio Build Tools con il componente C++ Desktop.

## Prima dell'invio

1. Verifica che l'identita del prodotto in Partner Center coincida con i valori presenti nell'elemento `Identity` di `Package.appxmanifest`.
2. Esegui di nuovo `npm run build:store`.
3. Carica il nuovo MSIX in Partner Center. Microsoft applichera la firma durante la pubblicazione.

Il certificato Aruba per la firma remota non viene utilizzato in questo flusso.
