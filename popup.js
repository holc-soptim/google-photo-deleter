let isRunning = false;

document.getElementById('startBtn').addEventListener('click', async () => {
  // Optimized settings for speed
  const batchSize = 100;  // Large batch for speed
  const delay = 300;      // Fast but safe delay
  
  // Check if on correct page
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.includes('photos.google.com')) {
    document.getElementById('status').textContent = 'ERROR: Please navigate to photos.google.com first!';
    document.getElementById('status').style.color = '#dc3545';
    return;
  }
  
  if (!confirm('Are you sure you want to delete ALL your photos? This cannot be undone!')) {
    return;
  }

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'block';
  document.getElementById('status').textContent = 'Starting deletion...';
  document.getElementById('status').style.color = '#28a745';
  
  isRunning = true;

  // Send message to content script to start deletion
  try {
    await browser.tabs.sendMessage(tab.id, {
      action: 'startDeletion',
      batchSize: batchSize,
      delay: delay
    });
  } catch (error) {
    document.getElementById('status').textContent = 'ERROR: Could not connect. Please reload the Google Photos page and try again.';
    document.getElementById('status').style.color = '#dc3545';
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
  document.getElementById('status').style.color = '#6c757d';
  isRunning = false;
});

// Listen for status updates from content script
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'status') {
    document.getElementById('status').textContent = message.status;
    document.getElementById('status').style.color = '#28a745';
  } else if (message.type === 'progress') {
    document.getElementById('progress').textContent = message.progress;
  } else if (message.type === 'batchProgress') {
    // Show batch progress bar
    const batchProgressDiv = document.getElementById('batchProgress');
    const batchStatusDiv = document.getElementById('batchStatus');
    const progressBar = document.getElementById('batchProgressBar');
    const percentageDiv = document.getElementById('batchPercentage');
    
    batchProgressDiv.style.display = 'block';
    batchStatusDiv.textContent = message.status;
    progressBar.style.width = message.percentage + '%';
    percentageDiv.textContent = Math.round(message.percentage) + '%';
  } else if (message.type === 'complete') {
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('status').textContent = message.status;
    document.getElementById('status').style.color = '#28a745';
    document.getElementById('batchProgress').style.display = 'none';
    isRunning = false;
  }
});

// Check page on load
(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.includes('photos.google.com')) {
    document.getElementById('status').textContent = 'Please open photos.google.com first';
    document.getElementById('status').style.color = '#dc3545';
    document.getElementById('startBtn').disabled = true;
  } else {
    document.getElementById('status').textContent = 'Ready to start';
    document.getElementById('status').style.color = '#28a745';
  }
})();
