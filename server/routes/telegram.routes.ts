import { Router, Request, Response } from 'express';
import { TelegramService } from '../services/telegram.service';
import { Database } from '../db';

const router = Router();

// Check status of Telegram Bot configuration
router.get('/status', (req: Request, res: Response) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = process.env.TELEGRAM_BOT_USERNAME;
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  const hasToken = Boolean(token && token.trim().length > 10 && token !== '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ');
  const botUsername = username ? username.replace(/^@/, '') : null;

  return res.json({
    configured: hasToken,
    bot_username: botUsername,
    app_url: appUrl,
    message: hasToken 
      ? `Telegram Bot (@${botUsername}) ulangan va faol.` 
      : 'TELEGRAM_BOT_TOKEN sozlanmagan. Iltimos, .env faylida bot tokenini ko‘rsating yoki veb interfeys orqali sinovdan o‘tkazing.'
  });
});

// Telegram Bot Webhook endpoint (registered with Telegram setWebhook)
router.post('/webhook', (req: Request, res: Response) => {
  // Respond to Telegram immediately with 200 OK so Telegram never marks webhook as failed
  res.status(200).json({ ok: true });

  const update = req.body;
  const message = update?.message;
  if (!message || !message.text) return;

  const text = message.text.trim();
  const chatId = message.chat.id;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token.length < 15 || token.includes('ABCdefGh')) {
    console.warn('Telegram webhook received update, but TELEGRAM_BOT_TOKEN is not configured.');
    return;
  }

  const appUrl = process.env.APP_URL || `https://${req.get('host')}`;

  // Process asynchronously without blocking
  (async () => {
    try {
      if (text.startsWith('/start sign_')) {
        const signToken = text.replace('/start sign_', '').trim();
        const signingRequest = Database.findSigningRequestByToken(signToken);

        if (signingRequest) {
          const doc = Database.findDocumentById(signingRequest.document_id);
          const botReply = TelegramService.buildBotStartResponse(
            signToken,
            signingRequest.recipient_name,
            doc?.original_filename || 'Hujjat',
            appUrl
          );

          await TelegramService.sendMessageViaBot(chatId, botReply.text, botReply.replyMarkup, token);
        } else {
          await TelegramService.sendMessageViaBot(
            chatId,
            '⚠️ <b>Xatolik:</b> Bu imzo so‘rovi topilmadi yoki muddati o‘tgan.',
            undefined,
            token
          );
        }
      } else if (text.startsWith('/start')) {
        const welcome = `Assalomu alaykum! Bu <b>DocuSign Telegram</b> platformasi boti.\n\nHujjatni imzolash uchun quyidagi tugmani bosing yoki QR kodni skanerlang:`;
        const replyMarkup = {
          inline_keyboard: [
            [
              {
                text: '✍️ Hujjatni imzolash (Mini App)',
                web_app: { url: appUrl }
              }
            ]
          ]
        };

        await TelegramService.sendMessageViaBot(chatId, welcome, replyMarkup, token);
      }
    } catch (err) {
      console.error('Asynchronous webhook dispatch error:', err);
    }
  })();
});

export default router;
