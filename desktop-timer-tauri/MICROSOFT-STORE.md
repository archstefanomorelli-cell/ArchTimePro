# Pubblicazione Microsoft Store

Il comando seguente crea un pacchetto MSIX non firmato, destinato al caricamento in Partner Center:

```powershell
npm run build:store
```

Il file viene salvato in `store-output/ArchTimeMiniTimer_0.2.4.0_x64.msix`.

La stessa procedura viene eseguita automaticamente dal workflow GitHub del timer, che pubblica il file tra gli artifact della build. Per compilare in locale servono i Visual Studio Build Tools con il componente C++ Desktop.

## Prima dell'invio

1. In Partner Center, riserva il nome `Arch Time Mini Timer`.
2. Apri l'identita del prodotto e copia i valori esatti di `Package/Identity/Name` e `Package/Identity/Publisher`.
3. Sostituisci i due valori nell'elemento `Identity` di `Package.appxmanifest`.
4. Esegui di nuovo `npm run build:store`.
5. Carica il nuovo MSIX in Partner Center. Microsoft applichera la firma durante la pubblicazione.

Il certificato Aruba per la firma remota non viene utilizzato in questo flusso.
