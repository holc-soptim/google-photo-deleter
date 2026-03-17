let isDeleting = false;
let totalDeleted = 0;

// Listen for messages from popup
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'startDeletion') {
    isDeleting = true;
    totalDeleted = 0;
    startDeletionProcess(message.batchSize, message.delay);
  } else if (message.action === 'stopDeletion') {
    isDeleting = false;
    sendStatus('Deletion stopped by user');
  }
});

function sendStatus(status) {
  browser.runtime.sendMessage({ type: 'status', status: status });
}

function sendProgress(progress) {
  browser.runtime.sendMessage({ type: 'progress', progress: progress });
}

function sendBatchProgress(status, percentage) {
  browser.runtime.sendMessage({ 
    type: 'batchProgress', 
    status: status, 
    percentage: percentage 
  });
}

function sendComplete(status) {
  browser.runtime.sendMessage({ type: 'complete', status: status });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startDeletionProcess(batchSize, delay) {
  sendStatus('Starting deletion process...');
  console.log('=== Starting deletion process ===');
  console.log(`Batch size: ${batchSize}, Delay: ${delay}ms`);
  
  let iterationCount = 0;
  const maxIterations = 10000; // Safety limit
  
  while (isDeleting && iterationCount < maxIterations) {
    iterationCount++;
    
    sendStatus(`Processing batch ${iterationCount}...`);
    sendBatchProgress('Starting batch...', 0);
    console.log(`--- Batch ${iterationCount} ---`);
    
    // Find all photo items
    const photoItems = findPhotoElements();
    
    console.log(`Found ${photoItems.length} photos on page`);
    
    if (photoItems.length === 0) {
      // Wait a bit and check again - might be loading
      console.log('No photos found, waiting 2 seconds and checking again...');
      await wait(2000);
      const recheckPhotos = findPhotoElements();
      
      if (recheckPhotos.length === 0) {
        console.log('Still no photos found after recheck. Assuming all deleted.');
        sendComplete(`Done! Deleted ${totalDeleted} photos total. Now empty the bin!`);
        isDeleting = false;
        break;
      } else {
        console.log(`Found ${recheckPhotos.length} photos on recheck, continuing...`);
        // Continue with the rechecked photos
        continue;
      }
    }
    
    sendProgress(`Found ${photoItems.length} photos on page. Total deleted so far: ${totalDeleted}`);
    
    // Store the first photo's ID or data attribute to check if page updates
    const firstPhotoId = photoItems[0].getAttribute('data-item-id') || 
                        photoItems[0].getAttribute('data-latest-creation-time') ||
                        photoItems[0].innerHTML.substring(0, 100);
    
    // Select photos - with progress updates
    sendBatchProgress('Selecting photos...', 10);
    const selectedCount = await selectPhotos(photoItems, batchSize);
    
    console.log(`Selection completed: ${selectedCount} photos selected (requested: ${batchSize})`);
    
    if (selectedCount === 0) {
      console.log('No photos could be selected, retrying...');
      sendStatus('No photos could be selected. Retrying...');
      await wait(delay);
      continue;
    }
    
    // If we selected very few photos (less than 25% of batch), something might be wrong
    if (selectedCount < batchSize * 0.25 && selectedCount < 10) {
      console.log(`Warning: Only selected ${selectedCount} out of ${batchSize} requested. Might be an issue, but continuing...`);
    }
    
    sendStatus(`Selected ${selectedCount} photos. Deleting...`);
    sendBatchProgress(`Selected ${selectedCount} photos`, 30);
    await wait(1000);
    
    // Click delete button
    sendBatchProgress('Clicking delete button...', 50);
    const deleteSuccess = await clickDeleteButton();
    
    if (!deleteSuccess) {
      console.log('Could not find delete button');
      sendStatus('Could not find delete button. Retrying...');
      await deselectAll();
      await wait(delay);
      continue;
    }
    
    sendBatchProgress('Confirming deletion...', 70);
    await wait(1500); // Wait for dialog
    
    // Confirm deletion
    const confirmSuccess = await confirmDeletion();
    
    if (!confirmSuccess) {
      console.log('Could not confirm deletion');
      sendStatus('Could not confirm deletion. Retrying...');
      await wait(delay);
      continue;
    }
    
    sendBatchProgress('Photos moved to bin!', 90);
    totalDeleted += selectedCount;
    console.log(`Batch deleted! Total so far: ${totalDeleted}`);
    sendProgress(`Batch deleted! Total: ${totalDeleted} photos`);
    
    // Wait for the page to update after deletion
    console.log('Waiting for page to update...');
    sendStatus('Waiting for page to refresh...');
    sendBatchProgress('Waiting for page refresh...', 95);
    
    // Wait and check if photos changed
    let pageUpdated = false;
    let attempts = 0;
    const maxAttempts = 15; // 7.5 seconds total
    
    while (attempts < maxAttempts && !pageUpdated) {
      await wait(500);
      attempts++;
      
      const newPhotoItems = findPhotoElements();
      
      console.log(`Check ${attempts}/${maxAttempts}: Found ${newPhotoItems.length} photos (was ${photoItems.length})`);
      
      // Check if number of photos decreased
      if (newPhotoItems.length < photoItems.length - (selectedCount / 2)) {
        console.log(`✓ Photo count decreased from ${photoItems.length} to ${newPhotoItems.length}. Continuing...`);
        pageUpdated = true;
        break;
      }
      
      if (newPhotoItems.length === 0) {
        console.log('All photos deleted from page!');
        pageUpdated = true;
        break;
      }
      
      // Check if first photo changed
      if (newPhotoItems.length > 0) {
        const newFirstPhotoId = newPhotoItems[0].getAttribute('data-item-id') || 
                               newPhotoItems[0].getAttribute('data-latest-creation-time') ||
                               newPhotoItems[0].innerHTML.substring(0, 100);
        
        if (newFirstPhotoId !== firstPhotoId) {
          console.log(`✓ Page updated! First photo changed. Continuing...`);
          pageUpdated = true;
          break;
        }
      }
      
      // If we're at 5 seconds and nothing changed, try scrolling
      if (attempts === 10) {
        console.log('Trying to scroll to trigger page update...');
        window.scrollBy(0, 500);
        await wait(100);
        window.scrollBy(0, -500);
      }
    }
    
    if (!pageUpdated) {
      console.log(`Page did not update after ${maxAttempts * 0.5} seconds. Continuing anyway...`);
      sendStatus('No page update detected, continuing...');
    }
    
    sendBatchProgress('Batch complete!', 100);
    
    // Additional delay between batches
    await wait(Math.max(delay, 500));
  }
  
  if (iterationCount >= maxIterations) {
    console.log('Reached safety limit');
    sendComplete(`Stopped at safety limit. Deleted ${totalDeleted} photos.`);
  }
}

function findPhotoElements() {
  console.log('Searching for photo elements...');
  
  // Try multiple selectors for photo elements
  const selectors = [
    'div[data-latest-creation-time]',
    'div[data-item-id]',
    'a[href*="/photo/"]',
    'div[role="listitem"]'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`Found ${elements.length} photos using selector: ${selector}`);
      // Filter to only visible elements that are actual photo thumbnails
      const filtered = Array.from(elements).filter(el => {
        const rect = el.getBoundingClientRect();
        // Must be visible and reasonably sized (thumbnails, not full-screen views)
        return rect.width > 50 && rect.height > 50 && rect.width < 500 && rect.height < 500;
      });
      console.log(`Filtered to ${filtered.length} visible photo thumbnails`);
      if (filtered.length > 0) {
        return filtered.slice(0, 200); // Limit to first 200
      }
    }
  }
  
  console.log('No photo elements found with any selector');
  return [];
}

async function selectPhotos(photoItems, batchSize) {
  let selectedCount = 0;
  
  console.log(`Attempting to select ${Math.min(photoItems.length, batchSize)} photos from ${photoItems.length} available...`);
  
  const targetCount = Math.min(photoItems.length, batchSize);
  
  // Try each photo up to batchSize
  for (let i = 0; i < targetCount; i++) {
    const item = photoItems[i];
    
    try {
      // Scroll item into view
      item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      await wait(50);
      
      // Simulate hover to make checkbox appear
      const mouseoverEvent = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      item.dispatchEvent(mouseoverEvent);
      await wait(50);
      
      // Look for checkbox - try multiple methods
      let clicked = false;
      
      // Method 1: Find checkbox by role in item
      let checkbox = item.querySelector('[role="checkbox"]');
      
      // Method 2: Find in parent if not found
      if (!checkbox) {
        checkbox = item.parentElement?.querySelector('[role="checkbox"]');
      }
      
      // Method 3: Look for any aria-label with "select"
      if (!checkbox) {
        const allElements = item.querySelectorAll('[aria-label]');
        for (const el of allElements) {
          const label = (el.getAttribute('aria-label') || '').toLowerCase();
          if (label.includes('select')) {
            checkbox = el;
            break;
          }
        }
      }
      
      if (checkbox) {
        checkbox.click();
        clicked = true;
        selectedCount++;
        
        // Update progress bar as we select
        const progress = 10 + (selectedCount / targetCount) * 20; // From 10% to 30%
        sendBatchProgress(`Selecting... ${selectedCount}/${targetCount}`, progress);
        
        await wait(50);
      } else {
        console.log(`No checkbox found for photo ${i+1}`);
      }
      
    } catch (e) {
      console.log(`Error selecting photo ${i+1}:`, e);
      continue;
    }
  }
  
  console.log(`✓ Successfully selected ${selectedCount} out of ${Math.min(photoItems.length, batchSize)} requested photos`);
  return selectedCount;
}

async function deselectAll() {
  // Try to find and click deselect/clear button
  const deselectButtons = [
    document.querySelector('[aria-label*="Clear selection"]'),
    document.querySelector('[aria-label*="Deselect"]'),
    document.querySelector('button[aria-label*="Close"]')
  ];
  
  for (const btn of deselectButtons) {
    if (btn) {
      btn.click();
      await wait(500);
      return true;
    }
  }
  
  // Press Escape key
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  return false;
}

async function clickDeleteButton() {
  console.log('Looking for delete button...');
  
  // First, look for visible buttons with delete-related text
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    if (btn.offsetParent === null) continue; // Skip hidden buttons
    
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    const title = (btn.getAttribute('title') || '').toLowerCase();
    const text = (btn.textContent || '').toLowerCase().trim();
    
    // Check for any delete/bin/trash keywords
    const keywords = ['delete', 'trash', 'bin', 'löschen', 'papierkorb'];
    const hasKeyword = keywords.some(kw => 
      ariaLabel.includes(kw) || title.includes(kw) || text.includes(kw)
    );
    
    if (hasKeyword) {
      console.log(`Found delete button! Text: "${text}", aria-label: "${ariaLabel}", title: "${title}"`);
      btn.click();
      console.log('Delete button clicked!');
      await wait(500);
      return true;
    }
  }
  
  console.log('No delete button found in button scan');
  
  // Try pressing Delete key as fallback
  console.log('Trying Delete key...');
  const activeEl = document.activeElement || document.body;
  
  // Try multiple key event types
  ['keydown', 'keypress', 'keyup'].forEach(eventType => {
    activeEl.dispatchEvent(new KeyboardEvent(eventType, { 
      key: 'Delete',
      keyCode: 46,
      code: 'Delete',
      which: 46,
      bubbles: true,
      cancelable: true
    }));
    
    document.dispatchEvent(new KeyboardEvent(eventType, { 
      key: 'Delete',
      keyCode: 46,
      code: 'Delete',
      which: 46,
      bubbles: true,
      cancelable: true
    }));
  });
  
  await wait(500);
  console.log('Delete key events dispatched');
  return true;
}

async function confirmDeletion() {
  await wait(1000); // Wait for dialog
  
  console.log('Looking for confirmation dialog...');
  
  // Check if there's actually a dialog/modal visible
  const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal, [aria-modal="true"]');
  console.log(`Found ${dialogs.length} dialog elements`);
  
  if (dialogs.length === 0) {
    console.log('No dialog found - trying to find buttons anyway');
  } else {
    console.log('Dialog found:', dialogs[0]);
    
    // Look for buttons INSIDE the dialog first
    for (const dialog of dialogs) {
      const dialogButtons = dialog.querySelectorAll('button');
      console.log(`Dialog has ${dialogButtons.length} buttons`);
      
      for (const btn of dialogButtons) {
        if (btn.offsetParent === null) continue;
        
        const text = (btn.textContent || '').toLowerCase().trim();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        
        console.log(`Dialog button: text="${text}", aria-label="${ariaLabel}"`);
        
        // Look for positive confirmation keywords
        const positiveKeywords = ['move to', 'bin', 'trash', 'delete', 'confirm', 'ok', 'yes', 
                                 'löschen', 'papierkorb', 'bestätigen', 'ja'];
        
        // Avoid negative keywords
        const negativeKeywords = ['cancel', 'close', 'no', 'abbrechen', 'nein'];
        
        const hasPositive = positiveKeywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
        const hasNegative = negativeKeywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
        
        if (hasPositive && !hasNegative) {
          console.log(`✓ CLICKING confirmation button: "${text}"`);
          btn.click();
          await wait(500);
          return true;
        }
      }
    }
  }
  
  // Fallback: check ALL visible buttons on page
  console.log('No button found in dialog, checking all page buttons...');
  const allButtons = document.querySelectorAll('button');
  
  for (const btn of allButtons) {
    if (btn.offsetParent === null) continue;
    
    const text = (btn.textContent || '').toLowerCase().trim();
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    
    const positiveKeywords = ['move to', 'bin', 'trash', 'delete', 'confirm', 'ok', 'yes'];
    const negativeKeywords = ['cancel', 'close', 'no', 'clear', 'share', 'create', 'add'];
    
    const hasPositive = positiveKeywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
    const hasNegative = negativeKeywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
    
    if (hasPositive && !hasNegative) {
      console.log(`✓ CLICKING button: text="${text}", aria-label="${ariaLabel}"`);
      btn.click();
      await wait(500);
      return true;
    }
  }
  
  console.log('Could not find confirmation button, trying Enter key...');
  
  // Press Enter to confirm
  ['keydown', 'keypress', 'keyup'].forEach(eventType => {
    document.dispatchEvent(new KeyboardEvent(eventType, { 
      key: 'Enter',
      keyCode: 13,
      code: 'Enter',
      which: 13,
      bubbles: true,
      cancelable: true
    }));
  });
  
  await wait(500);
  return true;
}

console.log('✓ Google Photos Bulk Deleter extension loaded successfully');
console.log('Open the extension popup and click "Start Deleting All Photos" to begin');
console.log('');
console.log('Diagnostic commands you can run in console:');
console.log('  checkPhotos()  - See how many photos are detected');
console.log('  testSelect()   - Try selecting the first photo');
console.log('  testDelete()   - Try clicking the delete button');
console.log('  testConfirm()  - Try confirming deletion dialog');

// Diagnostic functions for debugging
window.checkPhotos = function() {
  const photos = findPhotoElements();
  console.log(`Found ${photos.length} photos on current page`);
  if (photos.length > 0) {
    console.log('First photo element:', photos[0]);
    console.log('Checkboxes in first photo:', photos[0].querySelectorAll('[role="checkbox"]'));
  }
  return photos.length;
};

window.testSelect = async function() {
  const photos = findPhotoElements();
  if (photos.length === 0) {
    console.log('No photos found!');
    return;
  }
  console.log(`Testing selection on first photo...`);
  const result = await selectPhotos([photos[0]], 1);
  console.log(`Selection result: ${result} photo(s) selected`);
};

window.testDelete = async function() {
  console.log('Testing delete button click...');
  const result = await clickDeleteButton();
  console.log(`Delete button result: ${result}`);
};

window.testConfirm = async function() {
  console.log('Testing confirmation...');
  const result = await confirmDeletion();
  console.log(`Confirmation result: ${result}`);
};

