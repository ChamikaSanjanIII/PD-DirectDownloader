const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Extract PixelDrain File ID from full URL or plain ID
function extractFileId(input) {
    if (!input) return null;
    const match = input.match(/(?:pixeldrain\.com\/(?:u|api\/file)\/)?([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'running', service: 'PixelDrain Direct Stream Server' });
});

// /download/:id — Redirect client directly to PixelDrain CDN (Request goes from User's IP)
app.get('/download/:id*', (req, res) => {
    const fileId = extractFileId(req.params.id + (req.params[0] || ''));
    if (!fileId) return res.status(400).json({ error: 'Invalid PixelDrain ID or URL' });

    const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
    console.log(`[Redirect] Directing user to PixelDrain file ID: ${fileId}`);
    return res.redirect(302, directUrl);
});

app.listen(PORT, () => {
    console.log(`\nPixelDrain Direct Redirect Server running on port ${PORT}`);
    console.log(`Use: http://localhost:${PORT}/download/FILE_ID`);
});
