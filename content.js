const MAX_ITERATIONS = 10000;
const RECHECK_WAIT_MS = 2000;
const MIN_SELECTION_RATIO = 0.25;
const MIN_PHOTOS_TO_SELECT = 10;
const WAIT_AFTER_SELECTION_MS = 1000;
const WAIT_BEFORE_CONFIRM_MS = 1500;
const PAGE_UPDATE_CHECK_INTERVAL_MS = 500;
const MAX_PAGE_UPDATE_ATTEMPTS = 15;
const SCROLL_TRIGGER_ATTEMPT = 10;
const SCROLL_AMOUNT = 500;
const MIN_PHOTO_SIZE = 50;
const MAX_PHOTO_SIZE = 500;
const MAX_PHOTOS_PER_BATCH = 200;
const SELECTION_WAIT_MS = 50;
const SELECTION_PROGRESS_DELTA = 20;
const MIN_BATCH_DELAY_MS = 500;
const DELETE_KEY_CODE = 46;
const ENTER_KEY_CODE = 13;

// Validation constants
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 250;
const MIN_DELAY = 0;
const MAX_DELAY = 10000;

// Calculation constants
const PARSE_INT_RADIX = 10;
const HALF_DIVISOR = 2;
const MS_TO_SECONDS_DIVISOR = 1000;
const SCROLL_X_COORDINATE = 0;
const DOUBLE_WAIT_MULTIPLIER = 2;
const INITIAL_COUNT = 0;

// Progress percentages
const PROGRESS_BATCH_START = 0;
const PROGRESS_SELECTING_START = 10;
const PROGRESS_SELECTING_END = 30;
const PROGRESS_DELETE_CLICK = 50;
const PROGRESS_CONFIRMING = 70;
const PROGRESS_MOVED_TO_BIN = 90;
const PROGRESS_WAITING_REFRESH = 95;
const PROGRESS_BATCH_COMPLETE = 100;

let isDeleting = false;
let totalDeleted = INITIAL_COUNT;

browser.runtime.onMessage.addListener((message, sender) => {
  // Validate sender is from this extension
  if (!sender || sender.id !== browser.runtime.id) {
    console.error('Message from unauthorized sender rejected');
    return;
  }
  
  if (message.action === 'startDeletion') {
    // Validate input parameters
    const batchSize = parseInt(message.batchSize, PARSE_INT_RADIX);
    const delay = parseInt(message.delay, PARSE_INT_RADIX);
    
    if (!Number.isFinite(batchSize) || batchSize < MIN_BATCH_SIZE || batchSize > MAX_BATCH_SIZE) {
      console.error('Invalid batchSize:', message.batchSize);
      sendStatus('Error: Invalid batch size parameter');
      return;
    }
    if (!Number.isFinite(delay) || delay < MIN_DELAY || delay > MAX_DELAY) {
      console.error('Invalid delay:', message.delay);
      sendStatus('Error: Invalid delay parameter');
      return;
    }
    
    isDeleting = true;
    totalDeleted = INITIAL_COUNT;
    startDeletionProcess(batchSize, delay);
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
  
  let iterationCount = INITIAL_COUNT;
  
  while (isDeleting && iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    
    sendStatus(`Processing batch ${iterationCount}...`);
    sendBatchProgress('Starting batch...', PROGRESS_BATCH_START);
    console.log(`--- Batch ${iterationCount} ---`);
    
    const photoItems = findPhotoElements();
    
    console.log(`Found ${photoItems.length} photos on page`);
    
    if (photoItems.length === 0) {
      console.log(`No photos found, waiting ${RECHECK_WAIT_MS}ms and checking again...`);
      await wait(RECHECK_WAIT_MS);
      const recheckPhotos = findPhotoElements();
      
      if (recheckPhotos.length === 0) {
        console.log('Still no photos found after recheck. Assuming all deleted.');
        sendComplete(`Done! Deleted ${totalDeleted} photos total. Now empty the bin!`);
        isDeleting = false;
        break;
      } else {
        console.log(`Found ${recheckPhotos.length} photos on recheck, continuing...`);
        continue;
      }
    }
    
    sendProgress(`Found ${photoItems.length} photos on page. Total deleted so far: ${totalDeleted}`);
    
    // Get unique identifier for first photo (safe alternatives)
    const firstPhotoId = photoItems[0].getAttribute('data-item-id') || 
                        photoItems[0].getAttribute('data-latest-creation-time') ||
                        photoItems[0].id ||
                        'photo-' + Date.now();
    
    sendBatchProgress('Selecting photos...', PROGRESS_SELECTING_START);
    const selectedCount = await selectPhotos(photoItems, batchSize);
    
    console.log(`Selection completed: ${selectedCount} photos selected (requested: ${batchSize})`);
    
    if (selectedCount === 0) {
      console.log('No photos could be selected, retrying...');
      sendStatus('No photos could be selected. Retrying...');
      await wait(delay);
      continue;
    }
    
    if (selectedCount < batchSize * MIN_SELECTION_RATIO && selectedCount < MIN_PHOTOS_TO_SELECT) {
      console.log(`Warning: Only selected ${selectedCount} out of ${batchSize} requested. Might be an issue, but continuing...`);
    }
    
    sendStatus(`Selected ${selectedCount} photos. Deleting...`);
    sendBatchProgress(`Selected ${selectedCount} photos`, PROGRESS_SELECTING_END);
    await wait(WAIT_AFTER_SELECTION_MS);
    
    sendBatchProgress('Clicking delete button...', PROGRESS_DELETE_CLICK);
    const deleteSuccess = await clickDeleteButton();
    
    if (!deleteSuccess) {
      console.log('Could not find delete button');
      sendStatus('Could not find delete button. Retrying...');
      await deselectAll();
      await wait(delay);
      continue;
    }
    
    sendBatchProgress('Confirming deletion...', PROGRESS_CONFIRMING);
    await wait(WAIT_BEFORE_CONFIRM_MS);
    
    const confirmSuccess = await confirmDeletion();
    
    if (!confirmSuccess) {
      console.log('Could not confirm deletion');
      sendStatus('Could not confirm deletion. Retrying...');
      await wait(delay);
      continue;
    }
    
    sendBatchProgress('Photos moved to bin!', PROGRESS_MOVED_TO_BIN);
    totalDeleted += selectedCount;
    console.log(`Batch deleted! Total so far: ${totalDeleted}`);
    sendProgress(`Batch deleted! Total: ${totalDeleted} photos`);
    
    console.log('Waiting for page to update...');
    sendStatus('Waiting for page to refresh...');
    sendBatchProgress('Waiting for page refresh...', PROGRESS_WAITING_REFRESH);
    
    let pageUpdated = false;
    let attempts = INITIAL_COUNT;
    
    while (attempts < MAX_PAGE_UPDATE_ATTEMPTS && !pageUpdated) {
      await wait(PAGE_UPDATE_CHECK_INTERVAL_MS);
      attempts++;
      
      const newPhotoItems = findPhotoElements();
      
      console.log(`Check ${attempts}/${MAX_PAGE_UPDATE_ATTEMPTS}: Found ${newPhotoItems.length} photos (was ${photoItems.length})`);
      
      if (newPhotoItems.length < photoItems.length - (selectedCount / HALF_DIVISOR)) {
        console.log(`✓ Photo count decreased from ${photoItems.length} to ${newPhotoItems.length}. Continuing...`);
        pageUpdated = true;
        break;
      }
      
      if (newPhotoItems.length === 0) {
        console.log('All photos deleted from page!');
        pageUpdated = true;
        break;
      }
      
      if (newPhotoItems.length > 0) {
        const newFirstPhotoId = newPhotoItems[0].getAttribute('data-item-id') || 
                               newPhotoItems[0].getAttribute('data-latest-creation-time') ||
                               newPhotoItems[0].id ||
                               'photo-new';
        
        if (newFirstPhotoId !== firstPhotoId) {
          console.log(`✓ Page updated! First photo changed. Continuing...`);
          pageUpdated = true;
          break;
        }
      }
      
      if (attempts === SCROLL_TRIGGER_ATTEMPT) {
        console.log('Trying to scroll to trigger page update...');
        window.scrollBy(SCROLL_X_COORDINATE, SCROLL_AMOUNT);
        await wait(SELECTION_WAIT_MS * DOUBLE_WAIT_MULTIPLIER);
        window.scrollBy(SCROLL_X_COORDINATE, -SCROLL_AMOUNT);
      }
    }
    
    if (!pageUpdated) {
      console.log(`Page did not update after ${MAX_PAGE_UPDATE_ATTEMPTS * PAGE_UPDATE_CHECK_INTERVAL_MS / MS_TO_SECONDS_DIVISOR} seconds. Continuing anyway...`);
      sendStatus('No page update detected, continuing...');
    }
    
    sendBatchProgress('Batch complete!', PROGRESS_BATCH_COMPLETE);
    
    await wait(Math.max(delay, MIN_BATCH_DELAY_MS));
  }
  
  if (iterationCount >= MAX_ITERATIONS) {
    console.log('Reached safety limit');
    sendComplete(`Stopped at safety limit. Deleted ${totalDeleted} photos.`);
  }
}

function findPhotoElements() {
  console.log('Searching for photo elements...');
  
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
      const filtered = Array.from(elements).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > MIN_PHOTO_SIZE && rect.height > MIN_PHOTO_SIZE && rect.width < MAX_PHOTO_SIZE && rect.height < MAX_PHOTO_SIZE;
      });
      console.log(`Filtered to ${filtered.length} visible photo thumbnails`);
      if (filtered.length > 0) {
        return filtered.slice(0, MAX_PHOTOS_PER_BATCH);
      }
    }
  }
  
  console.log('No photo elements found with any selector');
  return [];
}

async function selectPhotos(photoItems, batchSize) {
  let selectedCount = INITIAL_COUNT;
  
  console.log(`Attempting to select ${Math.min(photoItems.length, batchSize)} photos from ${photoItems.length} available...`);
  
  const targetCount = Math.min(photoItems.length, batchSize);
  
  for (let i = 0; i < targetCount; i++) {
    const item = photoItems[i];
    
    try {
      item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      await wait(SELECTION_WAIT_MS);
      
      const mouseoverEvent = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      item.dispatchEvent(mouseoverEvent);
      await wait(SELECTION_WAIT_MS);
      
      let clicked = false;
      
      let checkbox = item.querySelector('[role="checkbox"]');
      
      if (!checkbox) {
        checkbox = item.parentElement?.querySelector('[role="checkbox"]');
      }
      
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
        
        const progress = PROGRESS_SELECTING_START + (selectedCount / targetCount) * SELECTION_PROGRESS_DELTA;
        sendBatchProgress(`Selecting... ${selectedCount}/${targetCount}`, progress);
        
        await wait(SELECTION_WAIT_MS);
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
  
  const deselectButtons = [
    document.querySelector('[aria-label*="Clear selection"]'),
    document.querySelector('[aria-label*="Deselect"]'),
    document.querySelector('button[aria-label*="Close"]')
  ];
  
  for (const btn of deselectButtons) {
    if (btn) {
      btn.click();
      await wait(PAGE_UPDATE_CHECK_INTERVAL_MS);
      return true;
    }
  }
  
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  return false;
}

async function clickDeleteButton() {
  console.log('Looking for delete button...');
  
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    if (btn.offsetParent === null) continue;
    
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    const title = (btn.getAttribute('title') || '').toLowerCase();
    const text = (btn.textContent || '').toLowerCase().trim();
    
    const keywords = ['delete', 'trash', 'bin', 'löschen', 'papierkorb'];
    const hasKeyword = keywords.some(kw => 
      ariaLabel.includes(kw) || title.includes(kw) || text.includes(kw)
    );
    
    if (hasKeyword) {
      console.log(`Found delete button! Text: "${text}", aria-label: "${ariaLabel}", title: "${title}"`);
      btn.click();
      console.log('Delete button clicked!');
      await wait(PAGE_UPDATE_CHECK_INTERVAL_MS);
      return true;
    }
  }
  
  console.log('No delete button found in button scan');
  
  console.log('Trying Delete key...');
  const activeEl = document.activeElement || document.body;
  
  ['keydown', 'keypress', 'keyup'].forEach(eventType => {
    activeEl.dispatchEvent(new KeyboardEvent(eventType, { 
      key: 'Delete',
      keyCode: DELETE_KEY_CODE,
      code: 'Delete',
      which: DELETE_KEY_CODE,
      bubbles: true,
      cancelable: true
    }));
    
    document.dispatchEvent(new KeyboardEvent(eventType, { 
      key: 'Delete',
      keyCode: DELETE_KEY_CODE,
      code: 'Delete',
      which: DELETE_KEY_CODE,
      bubbles: true,
      cancelable: true
    }));
  });
  
  await wait(PAGE_UPDATE_CHECK_INTERVAL_MS);
  console.log('Delete key events dispatched');
  return true;
}

async function confirmDeletion() {
  await wait(WAIT_AFTER_SELECTION_MS);
  
  console.log('Looking for confirmation dialog...');
  
  const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal, [aria-modal="true"]');
  console.log(`Found ${dialogs.length} dialog elements`);
  
  if (dialogs.length === 0) {
    console.log('No dialog found - trying to find buttons anyway');
  } else {
    console.log('Dialog found:', dialogs[0]);
    
    for (const dialog of dialogs) {
      const dialogButtons = dialog.querySelectorAll('button');
      console.log(`Dialog has ${dialogButtons.length} buttons`);
      
      for (const btn of dialogButtons) {
        if (btn.offsetParent === null) continue;
        
        const text = (btn.textContent || '').toLowerCase().trim();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        
        console.log(`Dialog button: text="${text}", aria-label="${ariaLabel}"`);
        
        const positiveKeywords = ['move to', 'bin', 'trash', 'delete', 'confirm', 'ok', 'yes', 
                                 'löschen', 'papierkorb', 'bestätigen', 'ja'];
        
        const negativeKeywords = ['cancel', 'close', 'no', 'abbrechen', 'nein'];
        
        const hasPositive = positiveKeywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
        const hasNegative = negativeKeywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
        
        if (hasPositive && !hasNegative) {
          console.log(`✓ CLICKING confirmation button: "${text}"`);
          btn.click();
          await wait(PAGE_UPDATE_CHECK_INTERVAL_MS);
          return true;
        }
      }
    }
  }
  
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
      await wait(PAGE_UPDATE_CHECK_INTERVAL_MS);
      return true;
    }
  }
  
  console.log('Could not find confirmation button, trying Enter key...');
  
  ['keydown', 'keypress', 'keyup'].forEach(eventType => {
    document.dispatchEvent(new KeyboardEvent(eventType, { 
      key: 'Enter',
      keyCode: ENTER_KEY_CODE,
      code: 'Enter',
      which: ENTER_KEY_CODE,
      bubbles: true,
      cancelable: true
    }));
  });
  
  await wait(PAGE_UPDATE_CHECK_INTERVAL_MS);
  return true;
}

console.log('✓ Google Photos Bulk Deleter extension loaded successfully');
console.log('Open the extension popup and click "Start Deleting All Photos" to begin');

