# Arch Time Mini Timer Light

Versione Tauri del timer desktop. Usa WebView2 di Windows e mantiene lo stesso frontend e la stessa sincronizzazione Supabase della versione Electron.

## Prerequisiti Windows

- Rust con toolchain MSVC
- Microsoft C++ Build Tools, workload "Desktop development with C++"
- WebView2 Runtime, gia presente sulle versioni recenti di Windows 10 e 11

## Sviluppo

```powershell
npm.cmd install
npm.cmd run dev
```

## Installer

```powershell
npm.cmd run build
```

L'installer NSIS viene creato in `src-tauri/target/release/bundle/nsis`.
