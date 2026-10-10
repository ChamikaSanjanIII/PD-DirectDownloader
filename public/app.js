document.addEventListener('DOMContentLoaded', () => {
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const loader = document.getElementById('loader');
  const resultCard = document.getElementById('resultCard');
  const errorMessage = document.getElementById('errorMessage');

  const fileName = document.getElementById('fileName');
  const fileMime = document.getElementById('fileMime');
  const fileSize = document.getElementById('fileSize');
  const fileDate = document.getElementById('fileDate');
  const fileDownloads = document.getElementById('fileDownloads');
  const fileIdTag = document.getElementById('fileIdTag');

  const directUrlInput = document.getElementById('directUrlInput');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const downloadAnchor = document.getElementById('downloadAnchor');

  const testStreamBtn = document.getElementById('testStreamBtn');
  const streamTesterCard = document.getElementById('streamTesterCard');
  const streamProgressBar = document.getElementById('streamProgressBar');
  const downloadedMB = document.getElementById('downloadedMB');
  const liveSpeed = document.getElementById('liveSpeed');
  const progressPercent = document.getElementById('progressPercent');
  const streamStatusBadge = document.getElementById('streamStatusBadge');

  let currentFileId = null;
  let totalFileSizeBytes = 0;

  // Format bytes to human readable
  function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Paste clipboard
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text;
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  });

  // Handle URL form submit
  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputVal = urlInput.value.trim();
    if (!inputVal) return;

    // Reset UI
    errorMessage.classList.add('hidden');
    resultCard.classList.add('hidden');
    streamTesterCard.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(inputVal)}`);
      const data = await res.json();

      loader.classList.add('hidden');

      if (!data.success) {
        errorMessage.textContent = data.error || 'Failed to fetch Pixeldrain file info.';
        errorMessage.classList.remove('hidden');
        return;
      }

      currentFileId = data.id;
      totalFileSizeBytes = data.size || 0;

      // Populate file details
      fileName.textContent = data.name || 'Untitled File';
      fileMime.textContent = data.mime_type || 'application/octet-stream';
      fileSize.textContent = formatBytes(data.size);
      fileDate.textContent = data.date_upload ? new Date(data.date_upload).toLocaleDateString() : '-';
      fileDownloads.textContent = data.downloads ? data.downloads.toLocaleString() : '0';
      fileIdTag.textContent = data.id;

      // Construct custom download & stream URLs
      const directUrl = `${window.location.origin}/download/${data.id}`;
      const previewUrl = `${window.location.origin}/stream/${data.id}`;

      directUrlInput.value = directUrl;
      downloadAnchor.href = directUrl;
      downloadAnchor.setAttribute('download', data.name || `${data.id}.bin`);

      const previewAnchor = document.getElementById('previewAnchor');
      if (previewAnchor) {
        previewAnchor.href = previewUrl;
      }

      resultCard.classList.remove('hidden');
    } catch (err) {
      loader.classList.add('hidden');
      errorMessage.textContent = 'Network error while reaching local server.';
      errorMessage.classList.remove('hidden');
    }
  });

  // Copy link action
  copyBtn.addEventListener('click', () => {
    if (!directUrlInput.value) return;
    navigator.clipboard.writeText(directUrlInput.value).then(() => {
      copyBtnText.textContent = 'Copied!';
      setTimeout(() => {
        copyBtnText.textContent = 'Copy Link';
      }, 2000);
    });
  });

  // Real-time chunked stream speed test
  testStreamBtn.addEventListener('click', async () => {
    if (!currentFileId) return;

    streamTesterCard.classList.remove('hidden');
    streamStatusBadge.textContent = 'Connecting...';
    streamProgressBar.style.width = '0%';
    downloadedMB.textContent = '0.00 MB';
    liveSpeed.textContent = '0.00 MB/s';
    progressPercent.textContent = '0%';

    const startTime = performance.now();
    let receivedBytes = 0;
    let lastTime = startTime;
    let lastBytes = 0;

    try {
      const response = await fetch(`/api/download/${currentFileId}`);
      if (!response.ok) throw new Error('Stream failed');

      streamStatusBadge.textContent = 'Streaming...';

      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedBytes += value.length;
        const now = performance.now();
        const timeDiffSec = (now - lastTime) / 1000;

        // Calculate speed every 250ms
        if (timeDiffSec > 0.25) {
          const bytesDiff = receivedBytes - lastBytes;
          const currentSpeedMBs = (bytesDiff / (1024 * 1024)) / timeDiffSec;
          liveSpeed.textContent = `${currentSpeedMBs.toFixed(2)} MB/s`;

          lastTime = now;
          lastBytes = receivedBytes;
        }

        downloadedMB.textContent = `${(receivedBytes / (1024 * 1024)).toFixed(2)} MB`;

        if (totalFileSizeBytes > 0) {
          const pct = Math.min(100, (receivedBytes / totalFileSizeBytes) * 100);
          streamProgressBar.style.width = `${pct.toFixed(1)}%`;
          progressPercent.textContent = `${pct.toFixed(1)}%`;
        }
      }

      streamStatusBadge.textContent = 'Completed!';
      liveSpeed.textContent = 'Finished';
      if (totalFileSizeBytes > 0) streamProgressBar.style.width = '100%';

    } catch (err) {
      console.error(err);
      streamStatusBadge.textContent = 'Stream Interrupted';
    }
  });
});
