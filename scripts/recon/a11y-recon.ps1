# -----------------------------------------------------------------------------
# Phase 1a Recon -- Accessibility Audit (non-Game-Mode surfaces)
# Run from: C:\Users\KKUBERANA1\Documents\lineup-generator-ux
# Usage: .\scripts\recon\a11y-recon.ps1
# Output: terminal (paste back to Claude)
# -----------------------------------------------------------------------------

$src    = "frontend\src\components"
$appJsx = "frontend\src\App.jsx"

# Components: exclude game-mode/, ScoringMode/, and test files
$componentFiles = Get-ChildItem -Path $src -Recurse -Include "*.jsx","*.js" |
  Where-Object {
    $_.FullName -notmatch "\\game-mode\\" -and
    $_.FullName -notmatch "\\ScoringMode\\" -and
    $_.Name     -notmatch "\.test\.(jsx?|js)$"
  }

# Add App.jsx explicitly (read-only audit -- findings defer to v2.5.x)
$appFile = Get-Item $appJsx
$files   = @($componentFiles) + @($appFile)

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " A11Y RECON -- Non-Game-Mode Surfaces" -ForegroundColor Cyan
Write-Host " Component files: $($componentFiles.Count)  +  App.jsx" -ForegroundColor Cyan
Write-Host " (App.jsx findings are read-only -- defer to v2.5.x)" -ForegroundColor DarkYellow
Write-Host "======================================================"
Write-Host ""

# -----------------------------------------------------------------------------
# SECTION 1: Font sizes below 12px floor
# px values: 7.5, 8, 9, 9.5, 10, 10.5, 11
# bare numerics: 7, 8, 9, 10, 11 (no unit)
# rem values: anything below 0.75rem (= 12px)
# -----------------------------------------------------------------------------
Write-Host "-- SECTION 1: Font sizes below 12px floor --" -ForegroundColor Yellow

$fontPxPattern   = 'fontSize\s*:\s*[''"]?(7\.5|8|9|9\.5|10|10\.5|11)px[''"]?'
$fontBarePattern = 'fontSize\s*:\s*(7|8|9|10|11)(?![0-9a-zA-Z''"\.])'
$fontRemPattern  = 'fontSize\s*:\s*[''"]?(0\.\d+)rem[''"]?'

$fontHits = @()
foreach ($f in $files) {
  $isAppJsx = ($f.Name -eq "App.jsx")
  $lines = Get-Content $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line    = $lines[$i]
    $matched = $false

    if ($line -match $fontPxPattern -or $line -match $fontBarePattern) {
      $matched = $true
    }

    if (-not $matched -and $line -match $fontRemPattern) {
      $remVal = [double]$Matches[1]
      if ($remVal -lt 0.75) { $matched = $true }
    }

    if ($matched) {
      $fontHits += [PSCustomObject]@{
        File     = $f.FullName.Replace((Get-Location).Path + "\", "")
        Line     = $i + 1
        Content  = $line.Trim()
        IsAppJsx = $isAppJsx
      }
    }
  }
}

if ($fontHits.Count -eq 0) {
  Write-Host "  No sub-12px font sizes found." -ForegroundColor Green
} else {
  $appCount  = ($fontHits | Where-Object { $_.IsAppJsx }).Count
  $compCount = ($fontHits | Where-Object { -not $_.IsAppJsx }).Count
  Write-Host "  Found $($fontHits.Count) hit(s)  [components: $compCount  |  App.jsx (defer): $appCount]" -ForegroundColor Red
  $fontHits | Group-Object File | ForEach-Object {
    $label = if ($_.Name -match "App\.jsx$") { " [App.jsx -- defer to v2.5.x]" } else { "" }
    Write-Host ""
    Write-Host "  FILE: $($_.Name)$label" -ForegroundColor White
    $_.Group | ForEach-Object { Write-Host "    L$($_.Line): $($_.Content)" }
  }
}

# -----------------------------------------------------------------------------
# SECTION 2: Explicit touch targets below 44px
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "-- SECTION 2: Explicit touch targets below 44px --" -ForegroundColor Yellow

$touchPattern     = '(minHeight|height)\s*:\s*[''"]?(1[0-9]|2[0-9]|3[0-9]|4[0-3])px[''"]?'
$touchBarePattern = '(minHeight|height)\s*:\s*(1[0-9]|2[0-9]|3[0-9]|4[0-3])(?![0-9a-zA-Z''"\.])'

$touchHits = @()
foreach ($f in $files) {
  $isAppJsx = ($f.Name -eq "App.jsx")
  $lines = Get-Content $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $touchPattern -or $lines[$i] -match $touchBarePattern) {
      $touchHits += [PSCustomObject]@{
        File     = $f.FullName.Replace((Get-Location).Path + "\", "")
        Line     = $i + 1
        Content  = $lines[$i].Trim()
        IsAppJsx = $isAppJsx
      }
    }
  }
}

if ($touchHits.Count -eq 0) {
  Write-Host "  No explicit sub-44px height/minHeight found." -ForegroundColor Green
} else {
  $appCount  = ($touchHits | Where-Object { $_.IsAppJsx }).Count
  $compCount = ($touchHits | Where-Object { -not $_.IsAppJsx }).Count
  Write-Host "  Found $($touchHits.Count) hit(s)  [components: $compCount  |  App.jsx (defer): $appCount]" -ForegroundColor Red
  $touchHits | Group-Object File | ForEach-Object {
    $label = if ($_.Name -match "App\.jsx$") { " [App.jsx -- defer to v2.5.x]" } else { "" }
    Write-Host ""
    Write-Host "  FILE: $($_.Name)$label" -ForegroundColor White
    $_.Group | ForEach-Object { Write-Host "    L$($_.Line): $($_.Content)" }
  }
}

# -----------------------------------------------------------------------------
# SECTION 3: <button> elements without aria-label or aria-labelledby
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "-- SECTION 3: <button> without aria-label --" -ForegroundColor Yellow

$buttonHits = @()
foreach ($f in $files) {
  $isAppJsx = ($f.Name -eq "App.jsx")
  $lines = Get-Content $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<button" -and
        $lines[$i] -notmatch "aria-label" -and
        $lines[$i] -notmatch "aria-labelledby" -and
        $lines[$i] -notmatch "//") {
      $buttonHits += [PSCustomObject]@{
        File     = $f.FullName.Replace((Get-Location).Path + "\", "")
        Line     = $i + 1
        Content  = $lines[$i].Trim()
        IsAppJsx = $isAppJsx
      }
    }
  }
}

if ($buttonHits.Count -eq 0) {
  Write-Host "  No <button> without aria-label found." -ForegroundColor Green
} else {
  $appCount  = ($buttonHits | Where-Object { $_.IsAppJsx }).Count
  $compCount = ($buttonHits | Where-Object { -not $_.IsAppJsx }).Count
  Write-Host "  Found $($buttonHits.Count) hit(s)  [components: $compCount  |  App.jsx (defer): $appCount]" -ForegroundColor Red
  Write-Host "  Note: multi-line <button> props appear here -- check context before actioning." -ForegroundColor DarkYellow
  $buttonHits | Group-Object File | ForEach-Object {
    $label = if ($_.Name -match "App\.jsx$") { " [App.jsx -- defer to v2.5.x]" } else { "" }
    Write-Host ""
    Write-Host "  FILE: $($_.Name)$label" -ForegroundColor White
    $_.Group | ForEach-Object { Write-Host "    L$($_.Line): $($_.Content)" }
  }
}

# -----------------------------------------------------------------------------
# SECTION 4: onClick on div/span/li (needs role="button" + aria-label + onKeyDown)
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "-- SECTION 4: onClick on div/span/li (needs role+aria) --" -ForegroundColor Yellow

$clickDivPattern = "<(div|span|li)[^>]*onClick"
$clickDivHits = @()
foreach ($f in $files) {
  $isAppJsx = ($f.Name -eq "App.jsx")
  $lines = Get-Content $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $clickDivPattern -and $lines[$i] -notmatch "//") {
      $clickDivHits += [PSCustomObject]@{
        File     = $f.FullName.Replace((Get-Location).Path + "\", "")
        Line     = $i + 1
        Content  = $lines[$i].Trim()
        IsAppJsx = $isAppJsx
      }
    }
  }
}

if ($clickDivHits.Count -eq 0) {
  Write-Host "  No onClick on div/span/li found." -ForegroundColor Green
} else {
  $appCount  = ($clickDivHits | Where-Object { $_.IsAppJsx }).Count
  $compCount = ($clickDivHits | Where-Object { -not $_.IsAppJsx }).Count
  Write-Host "  Found $($clickDivHits.Count) hit(s)  [components: $compCount  |  App.jsx (defer): $appCount]" -ForegroundColor Red
  $clickDivHits | Group-Object File | ForEach-Object {
    $label = if ($_.Name -match "App\.jsx$") { " [App.jsx -- defer to v2.5.x]" } else { "" }
    Write-Host ""
    Write-Host "  FILE: $($_.Name)$label" -ForegroundColor White
    $_.Group | ForEach-Object { Write-Host "    L$($_.Line): $($_.Content)" }
  }
}

# -----------------------------------------------------------------------------
# SECTION 5: Modal/overlay patterns without role="dialog" or aria-modal
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "-- SECTION 5: Modal patterns without role/aria-modal --" -ForegroundColor Yellow

$modalFiles = @()
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $hasModalPattern = ($content -match "(isOpen|showModal|isVisible|overlay|Modal|sheet|Sheet)") -and
                     ($content -match '(position\s*:\s*[''"]fixed|position\s*:\s*[''"]absolute)')
  $hasRoleDialog   = $content -match 'role\s*=\s*["'']dialog["'']'
  $hasAriaModal    = $content -match 'aria-modal'

  if ($hasModalPattern -and -not $hasRoleDialog -and -not $hasAriaModal) {
    $label = if ($f.Name -eq "App.jsx") { " [App.jsx -- defer to v2.5.x]" } else { "" }
    $modalFiles += $f.FullName.Replace((Get-Location).Path + "\", "") + $label
  }
}

if ($modalFiles.Count -eq 0) {
  Write-Host "  No undecorated modal patterns found." -ForegroundColor Green
} else {
  Write-Host "  Files with modal-like patterns but no role=dialog / aria-modal:" -ForegroundColor Red
  $modalFiles | ForEach-Object { Write-Host "  - $_" }
  Write-Host "  (Inspect each -- some may be tooltips or banners, not true dialogs)" -ForegroundColor DarkYellow
}

# -----------------------------------------------------------------------------
# SECTION 6: <img> without alt attribute
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "-- SECTION 6: <img> without alt --" -ForegroundColor Yellow

$imgHits = @()
foreach ($f in $files) {
  $isAppJsx = ($f.Name -eq "App.jsx")
  $lines = Get-Content $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<img" -and $lines[$i] -notmatch "alt=" -and $lines[$i] -notmatch "//") {
      $imgHits += [PSCustomObject]@{
        File     = $f.FullName.Replace((Get-Location).Path + "\", "")
        Line     = $i + 1
        Content  = $lines[$i].Trim()
        IsAppJsx = $isAppJsx
      }
    }
  }
}

if ($imgHits.Count -eq 0) {
  Write-Host "  No <img> without alt found." -ForegroundColor Green
} else {
  $appCount  = ($imgHits | Where-Object { $_.IsAppJsx }).Count
  $compCount = ($imgHits | Where-Object { -not $_.IsAppJsx }).Count
  Write-Host "  Found $($imgHits.Count) hit(s)  [components: $compCount  |  App.jsx (defer): $appCount]" -ForegroundColor Red
  $imgHits | Group-Object File | ForEach-Object {
    $label = if ($_.Name -match "App\.jsx$") { " [App.jsx -- defer to v2.5.x]" } else { "" }
    Write-Host ""
    Write-Host "  FILE: $($_.Name)$label" -ForegroundColor White
    $_.Group | ForEach-Object { Write-Host "    L$($_.Line): $($_.Content)" }
  }
}

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================"
Write-Host "  S1 -- Sub-12px font sizes:           $($fontHits.Count) hits"
Write-Host "  S2 -- Sub-44px height/minHeight:     $($touchHits.Count) hits"
Write-Host "  S3 -- <button> missing aria-label:   $($buttonHits.Count) hits"
Write-Host "  S4 -- onClick on div/span/li:        $($clickDivHits.Count) hits"
Write-Host "  S5 -- Modal without role/aria-modal: $($modalFiles.Count) files"
Write-Host "  S6 -- <img> without alt:             $($imgHits.Count) hits"
Write-Host ""
Write-Host "  Component files audited: $($componentFiles.Count)"
Write-Host "  + App.jsx (read-only)"
Write-Host "======================================================"
Write-Host ""
