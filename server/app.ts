import express from 'express';
import path from 'path';
import { Database } from './db';
import { TelegramService } from './services/telegram.service';
import apiRouter from './routes';

export const app = express();

// Initialize persistent database
Database.init().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Auto-start Telegram bot service
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL || 'https://ais-dev-mdagpclptq4qgrvak7w6os-18715293927.asia-southeast1.run.app';
if (botToken && botToken.length > 20) {
  TelegramService.startPolling(botToken, appUrl);
}

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Mount API router
app.use('/api', apiRouter);

// Static uploads serving with security headers
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res) => {
    // Protect raw executable access
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Serve local PDF.js worker without relying on external CDNs
const pdfjsBuildPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build');
app.use('/pdfjs-worker', express.static(pdfjsBuildPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mjs') || filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

export default app;
