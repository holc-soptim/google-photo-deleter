// Configuration constants
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_DELAY_MS = 300;

// Validation constants
const MIN_PERCENTAGE = 0;
const MAX_PERCENTAGE = 100;
const DEFAULT_PERCENTAGE = 0;

// UI Color constants
const COLORS = {
  SUCCESS: '#28a745',
  ERROR: '#dc3545',
  INFO: '#6c757d'
};

let isRunning = false;

document.getElementById('startBtn').addEventListener('click', async () => {
  
  const batchSize = DEFAULT_BATCH_SIZE;
  const delay = DEFAULT_DELAY_MS;
  
  
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.includes('photos.google.com')) {
    document.getElementById('status').textContent = 'ERROR: Please navigate to photos.google.com first!';
    document.getElementById('status').style.color = COLORS.ERROR;
    return;
  }
  
  if (!confirm('Are you sure you want to delete ALL your photos? This cannot be undone!')) {
    return;
  }

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'block';
  document.getElementById('status').textContent = 'Starting deletion...';
  document.getElementById('status').style.color = COLORS.SUCCESS;
  
  isRunning = true;

  try {
    await browser.tabs.sendMessage(tab.id, {
      action: 'startDeletion',
      batchSize: batchSize,
      delay: delay
    });
  } catch (error) {
    document.getElementById('status').textContent = 'ERROR: Could not connect. Please reload the Google Photos page and try again.';
    document.getElementById('status').style.color = COLORS.ERROR;
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    isRunning = false;
  }
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  try {
    await browser.tabs.sendMessage(tab.id, {
      action: 'stopDeletion'
    });
  } catch (error) {
    // Even if message fails, update UI
  }
  
  document.getElementById('startBtn').style.display = 'block';
  document.getElementById('stopBtn').style.display = 'none';
  document.getElementById('status').textContent = 'Stopped';
  document.getElementById('status').style.color = COLORS.INFO;
  isRunning = false;
});

browser.runtime.onMessage.addListener((message, sender) => {
  // Validate sender
  if (!sender || sender.id !== browser.runtime.id) {
    console.error('Message from unauthorized sender rejected');
    return;
  }
  
  // Validate message type
  if (!message.type || typeof message.type !== 'string') {
    console.error('Invalid message format');
    return;
  }
  
  if (message.type === 'status') {
    if (typeof message.status === 'string') {
      document.getElementById('status').textContent = message.status;
      document.getElementById('status').style.color = COLORS.SUCCESS;
    }
  } else if (message.type === 'progress') {
    if (typeof message.progress === 'string') {
      document.getElementById('progress').textContent = message.progress;
    }
  } else if (message.type === 'batchProgress') {
    // Show batch progress bar with bounds checking
    const batchProgressDiv = document.getElementById('batchProgress');
    const batchStatusDiv = document.getElementById('batchStatus');
    const progressBar = document.getElementById('batchProgressBar');
    const percentageDiv = document.getElementById('batchPercentage');
    
    // Validate and clamp percentage to valid range
    const percentage = Math.max(MIN_PERCENTAGE, Math.min(MAX_PERCENTAGE, parseFloat(message.percentage) || DEFAULT_PERCENTAGE));
    const status = typeof message.status === 'string' ? message.status : 'Processing...';
    
    batchProgressDiv.style.display = 'block';
    batchStatusDiv.textContent = status;
    progressBar.style.width = percentage + '%';
    percentageDiv.textContent = Math.round(percentage) + '%';
  } else if (message.type === 'complete') {
    if (typeof message.status === 'string') {
      document.getElementById('startBtn').style.display = 'block';
      document.getElementById('stopBtn').style.display = 'none';
      document.getElementById('status').textContent = message.status;
      document.getElementById('status').style.color = COLORS.SUCCESS;
      document.getElementById('batchProgress').style.display = 'none';
      isRunning = false;
    }
  }
});

(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  let isGooglePhotos = false;
  if (tab && typeof tab.url === 'string') {
    try {
      const urlObj = new URL(tab.url);
      isGooglePhotos = (urlObj.hostname === 'photos.google.com');
    } catch (e) {
      isGooglePhotos = false;
    }
  }

  if (!isGooglePhotos) {
    document.getElementById('status').textContent = 'Please open photos.google.com first';
    document.getElementById('status').style.color = COLORS.ERROR;
    document.getElementById('startBtn').disabled = true;
  } else {
    document.getElementById('status').textContent = 'Ready to start';
    document.getElementById('status').style.color = COLORS.SUCCESS;
  }
})();
