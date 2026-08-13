$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot "frontend\icon.png"
$assetsPath = Join-Path $projectRoot "Assets"

New-Item -ItemType Directory -Force -Path $assetsPath | Out-Null

function Save-SquareAsset {
    param(
        [string]$Name,
        [int]$Size
    )

    $source = [System.Drawing.Image]::FromFile($sourcePath)
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($source, 0, 0, $Size, $Size)
    $bitmap.Save((Join-Path $assetsPath $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    $source.Dispose()
}

function Save-WideAsset {
    param(
        [string]$Name,
        [int]$Width,
        [int]$Height
    )

    $source = [System.Drawing.Image]::FromFile($sourcePath)
    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $logoSize = [Math]::Floor($Height * 0.72)
    $left = [Math]::Floor(($Width - $logoSize) / 2)
    $top = [Math]::Floor(($Height - $logoSize) / 2)
    $graphics.DrawImage($source, $left, $top, $logoSize, $logoSize)
    $bitmap.Save((Join-Path $assetsPath $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    $source.Dispose()
}

Save-SquareAsset "StoreLogo.png" 50
Save-SquareAsset "AppList.png" 44
Save-SquareAsset "AppList.scale-200.png" 88
Save-SquareAsset "AppList.targetsize-24_altform-unplated.png" 24
Save-SquareAsset "MedTile.png" 150
Save-SquareAsset "MedTile.scale-200.png" 300
Save-WideAsset "WideTile.png" 310 150
Save-WideAsset "WideTile.scale-200.png" 620 300

Write-Host "Asset Microsoft Store aggiornati in $assetsPath"
