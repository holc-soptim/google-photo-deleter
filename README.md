# Google Photos Bulk Deleter - Firefox Extension

A browser extension to automate the deletion of all photos from Google Photos.

## ⚠️ WARNING
This extension will DELETE ALL your photos from Google Photos. This action cannot be easily undone. Make sure to:
1. Download your photos with Google Takeout first (if you want to keep them)
2. Be absolutely certain you want to delete everything

## Installation

### Prepare the Icon

First, create the icon.png file:
```powershell
cd google-photos-deleter
.\create-icon.ps1
```

Or create a simple icon manually:
- Create any 48x48 pixel PNG image
- Name it `icon.png` and save in the `google-photos-deleter` folder
- Or download a trash icon from https://icons8.com

### Install in Firefox

1. Open Firefox and type `about:debugging` in the address bar
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Navigate to the `google-photos-deleter` folder
5. Select the `manifest.json` file
6. The extension will be loaded temporarily (until you restart Firefox)

### For Permanent Installation

To make it permanent, you would need to:
1. Package it as a .xpi file
2. Sign it through Mozilla's Add-on distribution
3. Or use Firefox Developer Edition with `xpinstall.signatures.required` set to false

## How to Use

1. **Navigate to Google Photos first**: Go to https://photos.google.com/photos and sign in
2. **Load the extension**: Follow installation steps above if not already loaded
3. **Open the extension popup**: Click the trash icon in your Firefox toolbar
4. **Check the status**: Should say "Ready to start" (green text)
   - If it says "Please open photos.google.com first" - navigate to Google Photos
   - If it says connection error - reload the page and try again
5. **Click "Start Deleting All Photos"** (optimized for maximum speed with 100 photos per batch)
6. **Confirm** the warning dialog
7. **Wait** - The extension will automatically:
   - Select photos in batches
   - Click delete button
   - Confirm deletion
   - Repeat until all photos are gone
   - **Shows a progress bar** for each batch so you can see:
     - Selection progress (10-30%)
     - Delete button clicked (50%)
     - Confirmation (70%)
     - Photos moved to bin (90%)
     - Waiting for page refresh (95%)
     - Batch complete (100%)
9. **Monitor progress** in the popup window (shows how many deleted)
10. **After completion**: Go to https://photos.google.com/trash
11. **Click "Empty trash"** to permanently delete all items

## How It Works

The extension:
1. Finds photo elements on the page
2. Clicks checkboxes/checkmarks to select them
3. Clicks the delete button
4. Confirms the deletion dialog
5. Waits for the page to update
6. Repeats until no more photos are found

## Performance

The extension is optimized for maximum speed:
- **Batch size**: 100 photos per batch (large batches for speed)
- **Delay**: 300ms between batches (fast but safe)
- This provides the fastest deletion while remaining reliable

## Troubleshooting

**Check the Browser Console for Debugging:**
1. Press F12 to open Developer Tools
2. Go to the "Console" tab
3. Look for messages from the extension (marked with ✓ or errors)
4. You should see: "✓ Google Photos Bulk Deleter extension loaded successfully"
5. When running, you'll see detailed logs of what's happening

**Use Diagnostic Commands:**
In the browser console (F12), you can run these commands to debug:
- `checkPhotos()` - Shows how many photos are detected on the page
- `testSelect()` - Tries to select just the first photo to test if selection works
- `testDelete()` - Tests if the delete button can be found and clicked (select a photo first!)
- `testConfirm()` - Tests if the confirmation dialog can be confirmed (after clicking delete)

**Deletion not happening:**
1. Select a photo manually first
2. Open console (F12) and run `testDelete()` to see if delete button is found
3. If a dialog appears, run `testConfirm()` to see if it can be confirmed
4. Check the console output to see which buttons were found
5. The extension will list all visible buttons if it can't find the right one

**No photos being selected:**
1. Open the console (F12) and run `checkPhotos()` to see if photos are detected
2. If it returns 0, make sure you're on https://photos.google.com/photos
3. Try scrolling down to load more photos
4. Run `testSelect()` to test if a single selection works
5. Check the console logs to see what selector is being used

**"Could not establish connection. Receiving end does not exist."**
This error means the extension can't connect to the page. Fix it by:
1. Make sure you're on https://photos.google.com (not just any Google page)
2. Reload the Google Photos page (press F5)
3. Reload the extension in about:debugging (click Reload button)
4. Close and reopen the extension popup
5. If still not working, remove and re-add the extension

**"Cross-Origin Request blocked" or CORS errors:**
- These errors are from Google Photos itself, not the extension
- They're related to Google's own analytics/logging and can be safely ignored
- They don't affect the extension's functionality

**Extension doesn't work:**
- Make sure you're on photos.google.com/photos (not just photos.google.com)
- Try refreshing the page
- Try a smaller batch size
- Try a longer delay

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
