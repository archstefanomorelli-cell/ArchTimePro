$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$stagePath = Join-Path $projectRoot "store-package"
$outputPath = Join-Path $projectRoot "store-output"
$releaseExe = Join-Path $projectRoot "src-tauri\target\release\arch-time-mini-timer-light.exe"
$stagedExe = Join-Path $stagePath "ArchTimeMiniTimer.exe"
$manifestPath = Join-Path $projectRoot "Package.appxmanifest"
$manifest = [xml](Get-Content -LiteralPath $manifestPath -Raw)
$packageVersion = [string]$manifest.Package.Identity.Version
$packagePath = Join-Path $outputPath "ArchTimeMiniTimer_${packageVersion}_x64.msix"

$resolvedProjectRoot = [System.IO.Path]::GetFullPath($projectRoot)
$resolvedStagePath = [System.IO.Path]::GetFullPath($stagePath)
if (-not $resolvedStagePath.StartsWith($resolvedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "La cartella temporanea non appartiene al progetto."
}
if (-not (Test-Path -LiteralPath $releaseExe)) {
    throw "Eseguibile Tauri non trovato. Esegui prima la build."
}

Push-Location $projectRoot
try {
    & npm.cmd run store:validate
    if ($LASTEXITCODE -ne 0) { throw "Validazione manifest Microsoft Store non riuscita." }

    if (Test-Path -LiteralPath $stagePath) {
        Remove-Item -LiteralPath $stagePath -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $stagePath, $outputPath | Out-Null
    Copy-Item -LiteralPath $releaseExe -Destination $stagedExe -Force

    & npx.cmd winapp pack $stagePath --manifest $manifestPath --exe "ArchTimeMiniTimer.exe" --output $packagePath
    if ($LASTEXITCODE -ne 0) { throw "Creazione MSIX non riuscita." }

    Write-Host "Pacchetto Microsoft Store creato: $packagePath"
}
finally {
    Pop-Location
}
