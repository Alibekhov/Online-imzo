import { Router } from 'express';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';
import signingRoutes from './signing.routes';
import telegramRoutes from './telegram.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/signing', signingRoutes);
router.use('/telegram', telegramRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DocuSign Telegram Platform',
    timestamp: new Date().toISOString()
  });
});

export default router;
