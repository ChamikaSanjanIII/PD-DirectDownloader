const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to extract Pixeldrain file ID
function extractFileId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/pixeldrain\.com\/(?:u|api\/file|l)\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9_-]{4,16}$/.test(trimmed)) return trimmed;
  return null;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. API: /api/info?url=...
  if (pathname === '/api/info') {
    const rawUrl = parsedUrl.query.url;
    const fileId = extractFileId(rawUrl);

    if (!fileId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Invalid Pixeldrain URL or File ID' }));
    }

    try {
      const infoRes = await fetch(`https://pixeldrain.com/api/file/${fileId}/info`);
      if (!infoRes.ok) {
        const errData = await infoRes.json().catch(() => ({}));
        res.writeHead(infoRes.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: errData.value || errData.message || 'Failed to fetch file details from Pixeldrain'
        }));
      }

      const data = await infoRes.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        id: fileId,
        name: data.name,
        size: data.size,
        mime_type: data.mime_type,
        date_upload: data.date_upload,
        views: data.views,
        downloads: data.downloads,
        download_url: `/api/download/${fileId}`
      }));
    } catch (error) {
      console.error('Error in /api/info:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
    }
  }

  // 2. Custom Route: /download/:id or cloud.cmoviez.com/download/:id (Forced Direct Attachment Download)
  if (pathname.startsWith('/download/') || pathname.startsWith('/api/download/')) {
    const fileId = pathname.replace(/^\/(?:download|api\/download)\//, '');
    if (!fileId || !/^[a-zA-Z0-9_-]{4,16}$/.test(fileId)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Invalid File ID');
    }

    try {
      const pixeldrainUrl = `https://pixeldrain.com/api/file/${fileId}`;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      
      const reqHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        'X-Forwarded-For': clientIp
      };
      if (req.headers.range) {
        reqHeaders['Range'] = req.headers.range;
      }

      const pdRes = await fetch(pixeldrainUrl, { headers: reqHeaders });
      if (!pdRes.ok) {
        res.writeHead(pdRes.status, { 'Content-Type': 'text/plain' });
        return res.end(`Pixeldrain error: ${pdRes.statusText}`);
      }

      const responseHeaders = {};
      const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];

      headersToForward.forEach(h => {
        const val = pdRes.headers.get(h);
        if (val) responseHeaders[h] = val;
      });

      // Force Attachment for /download/:id or ?dl=1
      const isStreamRoute = pathname.startsWith('/stream/');
      const forceDownload = !isStreamRoute || parsedUrl.query.dl === '1' || parsedUrl.query.download === '1';
      let contentDisp = pdRes.headers.get('content-disposition');

      if (forceDownload || !contentDisp) {
        let fileName = parsedUrl.query.name || `${fileId}.bin`;
        if (contentDisp && contentDisp.includes('filename=')) {
          const match = contentDisp.match(/filename=["']?([^"';]+)["']?/);
          if (match && match[1]) fileName = match[1];
        }
        responseHeaders['content-type'] = forceDownload ? 'application/octet-stream' : (pdRes.headers.get('content-type') || 'application/octet-stream');
        responseHeaders['content-disposition'] = `attachment; filename="${encodeURIComponent(fileName)}"`;
      } else {
        responseHeaders['content-disposition'] = contentDisp;
      }

      res.writeHead(pdRes.status, responseHeaders);

      if (pdRes.body && typeof pdRes.body.getReader === 'function') {
        const reader = pdRes.body.getReader();
        req.on('close', () => reader.cancel().catch(() => {}));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        return res.end();
      } else if (pdRes.body && typeof pdRes.body.pipe === 'function') {
        return pdRes.body.pipe(res);
      } else {
        const arrayBuffer = await pdRes.arrayBuffer();
        return res.end(Buffer.from(arrayBuffer));
      }
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Stream transfer error');
      }
    }
    return;
  }

  // 3. Custom Route: /stream/:id or stream.cmoviez.com/stream/:id (Redirect to Live Preview Player)
  if (pathname.startsWith('/stream/')) {
    const fileId = pathname.replace('/stream/', '');
    if (!fileId || !/^[a-zA-Z0-9_-]{4,16}$/.test(fileId)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Invalid File ID');
    }

    // Serve preview.html dynamically for /stream/:id
    const filePath = path.join(PUBLIC_DIR, 'preview.html');
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Preview page not found');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8', 'Content-Length': stats.size });
      fs.createReadStream(filePath).pipe(res);
    });
    return;
  }

  // 3. Static Files Serving (HTML, CSS, JS)
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(reqPath));

  // Security check to prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stats.size });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Start Server with Auto Port Handling
function startServer(portToUse) {
  server.listen(portToUse, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`⚡ Zero-Dependency Pixeldrain Streamer Active!`);
    console.log(`📱 Local Access : http://localhost:${portToUse}`);
    console.log(`👁️ Preview Page : http://localhost:${portToUse}/preview.html`);
    console.log(`ℹ️  No npm install required! (Pure Node.js)`);
    console.log(`==================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${portToUse} is in use. Trying port ${portToUse + 1}...`);
      startServer(portToUse + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
