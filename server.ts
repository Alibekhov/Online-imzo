import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import app from './server/app';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const distPath = path.resolve(process.cwd(), 'dist');

// Serve Vite frontend build assets in production
app.use(express.static(distPath));

// Fallback all non-API requests to index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DocuSign Telegram server running on http://0.0.0.0:${PORT}`);
});
