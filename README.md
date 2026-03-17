# Google Photos Bulk Deleter

A Firefox extension to automate bulk deletion of photos from Google Photos.

## ⚠️ WARNING
**This extension will DELETE ALL your photos from Google Photos.** This action cannot be easily undone. Back up your photos with [Google Takeout](https://takeout.google.com/) first if you want to keep them.

## Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select the `manifest.json` file from this repository
4. The extension will be loaded (temporarily until Firefox restart)

## Usage

1. Navigate to https://photos.google.com/photos
2. Click the extension icon in your Firefox toolbar
3. Click "Start Deleting All Photos"
4. Confirm the warning
5. Wait for the automated deletion process to complete
6. Empty the trash at https://photos.google.com/trash to permanently delete

## How It Works

The extension automatically selects photos in batches, clicks delete, confirms deletion, and repeats until all photos are removed.

## Troubleshooting

If deletion stops or errors occur:
- Reload the Google Photos page
- Reload the extension in `about:debugging`
- Check the browser console (F12) for error messages

**Deletion stops:**
- Check if a dialog appeared that needs manual confirmation
- Reload the page and click the extension icon again to continue
- The extension has a safety limit of 10,000 iterations

**Photos still showing:**
- The page may need manual refresh
- Check the trash - photos are moved there first
- You need to manually empty the trash for permanent deletion

## Notes

- This uses automated clicking/selection - Google may update their UI which could break the extension
- The extension must be updated if Google Photos changes its HTML structure
- Speed is limited by Google's page loading and API rate limits
- This is provided as-is with no warranty

## Uninstallation

1. Go to `about:addons` in Firefox
2. Find "Google Photos Bulk Deleter"
3. Click "Remove"
