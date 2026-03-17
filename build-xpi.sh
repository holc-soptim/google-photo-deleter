#!/bin/bash

# Build XPI file for Firefox extension
EXTENSION_NAME="google-photos-deleter"
VERSION="1.0"
OUTPUT_FILE="${EXTENSION_NAME}-${VERSION}.xpi"

if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo "Removed old $OUTPUT_FILE"
fi

FILES=(
    "manifest.json"
    "background.js"
    "content.js"
    "popup.html"
    "popup.js"
    "icon.png"
)

echo "Creating XPI file..."
zip -q "$OUTPUT_FILE" "${FILES[@]}"

if [ $? -eq 0 ]; then
    echo -e "Successfully created $OUTPUT_FILE"
    echo ""
    echo -e "To install:"
    echo "1. Go to about:addons in Firefox"
    echo "2. Click the gear icon"
    echo "3. Select 'Install Add-on From File...'"
    echo "4. Choose the XPI file"
else
    echo -e "Error creating XPI file"
    exit 1
fi
