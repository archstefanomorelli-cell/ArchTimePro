$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $projectRoot "Package.appxmanifest"
$tauriConfigPath = Join-Path $projectRoot "src-tauri\tauri.conf.json"
$assetsPath = Join-Path $projectRoot "Assets"

$manifest = [xml](Get-Content -LiteralPath $manifestPath -Raw)
$tauriConfig = Get-Content -LiteralPath $tauriConfigPath -Raw | ConvertFrom-Json

$identity = $manifest.Package.Identity
$properties = $manifest.Package.Properties
$application = $manifest.Package.Applications.Application
$packageVersion = [version]$identity.Version
$expectedVersion = "$($tauriConfig.version).0"

$errors = [System.Collections.Generic.List[string]]::new()

if ([string]$identity.Name -ne "ArchTimePro.ArchTimeMiniTimer") {
    $errors.Add("Package/Identity/Name non coincide con Partner Center.")
}
if ([string]$identity.Publisher -ne "CN=9B2D1DCB-F661-4F25-9FE5-C483E56173DD") {
    $errors.Add("Package/Identity/Publisher non coincide con Partner Center.")
}
if ([string]$properties.PublisherDisplayName -ne "ArchTimePro") {
    $errors.Add("PublisherDisplayName deve essere ArchTimePro.")
}
if ($packageVersion.Revision -ne 0) {
    $errors.Add("Microsoft Store richiede che il quarto numero della versione sia 0.")
}
if ([string]$identity.Version -ne $expectedVersion) {
    $errors.Add("La versione MSIX deve essere $expectedVersion per coincidere con Tauri $($tauriConfig.version).")
}
if ([string]$properties.DisplayName -ne "Arch Time Mini Timer") {
    $errors.Add("DisplayName del pacchetto non corretto.")
}
if ([string]$application.Executable -ne "ArchTimeMiniTimer.exe") {
    $errors.Add("Nome dell'eseguibile MSIX non corretto.")
}

@(
    "StoreLogo.png",
    "AppList.png",
    "AppList.scale-200.png",
    "AppList.targetsize-24_altform-unplated.png",
    "MedTile.png",
    "MedTile.scale-200.png",
    "WideTile.png",
    "WideTile.scale-200.png"
) | ForEach-Object {
    if (-not (Test-Path -LiteralPath (Join-Path $assetsPath $_))) {
        $errors.Add("Asset Microsoft Store mancante: $_")
    }
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Manifest Microsoft Store verificato:"
Write-Host "  Name: $($identity.Name)"
Write-Host "  Publisher: $($identity.Publisher)"
Write-Host "  PublisherDisplayName: $($properties.PublisherDisplayName)"
Write-Host "  Version: $($identity.Version)"
