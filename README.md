# Google Photos Bulk Deleter

A Firefox extension to automate bulk deletion of photos from Google Photos.

## WARNING
**This extension will DELETE ALL your photos from Google Photos.** This action cannot be easily undone. Back up your photos with [Google Takeout](https://takeout.google.com/) first if you want to keep them.

### Temporary Loading (Development)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" -> "Load Temporary Add-on"
3. Select the `manifest.json` file from this repository
4. The extension will be loaded until Firefox restarts

## Usage

1. Navigate to https://photos.google.com and sign in
2. Click the extension icon in your Firefox toolbar
3. Click "Start Deleting All Photos" in the popup
4. Confirm the warning dialog
5. The popup will show progress updates
6. After completion, go to https://photos.google.com/trash and empty the trash

**Note:** Keep the browser tab with Google Photos active during the deletion process.

## How It Works

The extension automatically:
1. Selects photos in batches of up to 100
2. Clicks the delete button
3. Confirms the deletion dialog
4. Waits for the page to update
5. Repeats until no photos remain

## Building

Build scripts are included to package the extension:

**PowerShell (Windows):**
```powershell
.\build-xpi.ps1
```

**Bash (Linux/Mac):**
```bash
chmod +x build-xpi.sh
./build-xpi.sh
```

## Troubleshooting

**Extension doesn't start:**
- Make sure you're on https://photos.google.com
- Reload the Google Photos page
- Reload the extension in `about:debugging`
- Check the browser console (F12) for error messages

**Deletion stops:**
- Check if a dialog appeared that needs manual confirmation
- Reload the page and restart the extension
- The extension stops at 10,000 iterations as a safety measure

**Photos still showing:**
- Photos are moved to trash first, not permanently deleted
- Go to https://photos.google.com/trash to permanently delete
- Some photos may require manual refresh to disappear from view

## Configuration

Default settings can be adjusted in the code:
- Batch size: up to 100 photos (in `popup.js`)
- Delay between batches: 300ms (in `popup.js`)
- Safety iteration limit: 10,000 (in `content.js`)

## Notes

- This uses automated UI interaction - Google may update their interface
- The extension must be updated if Google Photos changes its structure
- Speed is limited by page loading and API rate limits
- Provided as-is with no warranty

## Uninstallation

1. Go to `about:addons` in Firefox
2. Find "Google Photos Bulk Deleter"
3. Click "Remove"
