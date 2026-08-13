$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseExe = Join-Path $projectRoot "src-tauri\target\release\arch-time-mini-timer-light.exe"

Push-Location $projectRoot
try {
    & npm.cmd run store:assets
    if ($LASTEXITCODE -ne 0) { throw "Generazione asset non riuscita." }

    & npm.cmd run tauri -- build --no-bundle
    if ($LASTEXITCODE -ne 0) { throw "Build Tauri non riuscita." }
    if (-not (Test-Path -LiteralPath $releaseExe)) { throw "Eseguibile Tauri non trovato." }

    & npm.cmd run store:package
    if ($LASTEXITCODE -ne 0) { throw "Creazione MSIX non riuscita." }
}
finally {
    Pop-Location
}
