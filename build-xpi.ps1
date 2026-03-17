# Build XPI file for Firefox extension
$extensionName = "google-photos-deleter"
$version = "1.0"
$outputFile = "$extensionName-$version.xpi"
$tempZip = "$extensionName-$version.zip"

if (Test-Path $outputFile) {
    Remove-Item $outputFile
    Write-Host "Removed old $outputFile"
}
if (Test-Path $tempZip) {
    Remove-Item $tempZip
}

$filesToInclude = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "icon.png"
)

Write-Host "Creating XPI file..."
Compress-Archive -Path $filesToInclude -DestinationPath $tempZip

Rename-Item -Path $tempZip -NewName $outputFile

Write-Host "Successfully created $outputFile"
Write-Host ""
Write-Host "To install:"
Write-Host "1. Go to about:addons in Firefox"
Write-Host "2. Click the gear icon"
Write-Host "3. Select 'Install Add-on From File...'"
Write-Host "4. Choose the XPI file"


