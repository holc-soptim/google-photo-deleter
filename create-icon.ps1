# Script to create icon.png from icon.svg
# This requires Inkscape or ImageMagick to be installed

Write-Host "Creating icon.png from SVG..." -ForegroundColor Cyan
Write-Host ""

# Check for ImageMagick
$magickPath = Get-Command "magick" -ErrorAction SilentlyContinue

if ($magickPath) {
    Write-Host "Using ImageMagick..." -ForegroundColor Green
    & magick convert -background none -resize 48x48 icon.svg icon.png
    
    if (Test-Path "icon.png") {
        Write-Host "[OK] icon.png created successfully!" -ForegroundColor Green
        exit 0
    }
}

# Check for Inkscape
$inkscapePath = Get-Command "inkscape" -ErrorAction SilentlyContinue

if ($inkscapePath) {
    Write-Host "Using Inkscape..." -ForegroundColor Green
    & inkscape icon.svg --export-type=png --export-filename=icon.png --export-width=48 --export-height=48
    
    if (Test-Path "icon.png") {
        Write-Host "[OK] icon.png created successfully!" -ForegroundColor Green
        exit 0
    }
}

# No converter found - provide instructions
Write-Host "ERROR: No SVG converter found." -ForegroundColor Red
Write-Host ""
Write-Host "Please install one of the following:" -ForegroundColor Yellow
Write-Host "1. ImageMagick: https://imagemagick.org/script/download.php" -ForegroundColor White
Write-Host "2. Inkscape: https://inkscape.org/release/" -ForegroundColor White
Write-Host ""
Write-Host "OR convert icon.svg to icon.png manually:" -ForegroundColor Yellow
Write-Host "- Open icon.svg in any image editor" -ForegroundColor White
Write-Host "- Export as PNG (48x48 pixels)" -ForegroundColor White
Write-Host "- Save as icon.png in this folder" -ForegroundColor White
Write-Host ""
Write-Host "OR use an online converter:" -ForegroundColor Yellow
Write-Host "- Upload icon.svg to https://cloudconvert.com/svg-to-png" -ForegroundColor White
Write-Host "- Download and rename to icon.png" -ForegroundColor White

exit 1
