import crypto from 'crypto';
import { Database } from '../db';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export class TelegramService {
  private static isPolling = false;
  private static lastUpdateId = 0;

  /**
   * Validates Telegram WebApp initData string using HMAC-SHA256.
   * Returns parsed user if valid, or null if invalid.
   */
  static validateInitData(initData: string, botToken?: string): { isValid: boolean; user?: TelegramUserData; error?: string } {
    if (!initData) {
      return { isValid: false, error: 'initData is empty' };
    }

    if (!botToken || botToken.trim().length === 0) {
      // In dev mode when bot token is not configured yet, parse user payload if available
      try {
        const urlParams = new URLSearchParams(initData);
        const userJson = urlParams.get('user');
        if (userJson) {
          const user = JSON.parse(userJson) as TelegramUserData;
          return { isValid: true, user };
        }
      } catch {
        // ignore parse error
      }
      return { isValid: true };
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      if (!hash) {
        return { isValid: false, error: 'Missing hash in initData' };
      }

      urlParams.delete('hash');

      // Sort keys alphabetically
      const pairs: string[] = [];
      const keys = Array.from(urlParams.keys()).sort();
      for (const key of keys) {
        pairs.push(`${key}=${urlParams.get(key)}`);
      }
      const dataCheckString = pairs.join('\n');

      // secret_key = HMAC_SHA256("WebAppData", botToken)
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

      // calculated_hash = HMAC_SHA256(dataCheckString, secretKey)
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (calculatedHash !== hash) {
        return { isValid: false, error: 'Invalid HMAC hash verification' };
      }

      const userJson = urlParams.get('user');
      const user = userJson ? JSON.parse(userJson) as TelegramUserData : undefined;

      return { isValid: true, user };
    } catch (err: any) {
      return { isValid: false, error: err.message || 'Verification exception' };
    }
  }

  /**
   * Generates a Telegram Bot response for /start sign_<token>
   * Returns markdown message and inline keyboard with web_app button.
   */
  static buildBotStartResponse(token: string, recipientName: string, docTitle: string, appUrl: string) {
    const cleanAppUrl = (appUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const webAppUrl = `${cleanAppUrl}/sign/${token}`;

    const text = `Assalomu alaykum, <b>${recipientName || 'Hurmatli mijoz'}</b>!\n\n` +
      `Sizga <b>"${docTitle || 'Hujjat'}"</b> hujjatini imzolash so‘rovi yuborildi.\n\n` +
      `Quyidagi tugmani bosing va telefoningizni gorizontal holatga o‘girib, imzoingizni qo‘ying.`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '✍️ Hujjatni imzolash (Mini App)',
            web_app: { url: webAppUrl }
          }
        ]
      ]
    };

    return { text, replyMarkup, webAppUrl };
  }

  /**
   * Helper to send Telegram message via official Bot API if TELEGRAM_BOT_TOKEN is set.
   */
  static async sendMessageViaBot(chatId: string | number, text: string, replyMarkup?: any, botToken?: string) {
    if (!botToken) return { success: false, reason: 'TELEGRAM_BOT_TOKEN not provided' };
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });
      const data = await response.json();
      return { success: data.ok, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Starts non-blocking real-time long polling for Telegram updates.
   * Guarantees 100% instant message delivery without requiring open incoming ports or webhooks.
   */
  static startPolling(botToken: string, appUrl: string) {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log('[Telegram Bot] Starting long-polling service for @Onlineimzo_bot...');

    const poll = async () => {
      if (!this.isPolling) return;
      try {
        const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=15`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            await this.processUpdate(update, botToken, appUrl);
          }
        }
      } catch (err) {
        // network pause
        await new Promise(r => setTimeout(r, 2000));
      }
      setTimeout(poll, 600);
    };

    poll();
  }

  /**
   * Processes an incoming message from Telegram
   */
  static async processUpdate(update: any, botToken: string, appUrl: string) {
    const msg = update?.message;
    if (!msg || !msg.text) return;
    const text = msg.text.trim();
    const chatId = msg.chat.id;
    const fromName = msg.from?.first_name || 'Foydalanuvchi';

    if (text.startsWith('/start sign_')) {
      const signToken = text.replace('/start sign_', '').trim();
      const signingRequest = Database.findSigningRequestByToken(signToken);

      if (signingRequest) {
        const doc = Database.findDocumentById(signingRequest.document_id);
        const botReply = this.buildBotStartResponse(
          signToken,
          signingRequest.recipient_name,
          doc?.original_filename || 'Hujjat',
          appUrl
        );
        await this.sendMessageViaBot(chatId, botReply.text, botReply.replyMarkup, botToken);
      } else {
        await this.sendMessageViaBot(
          chatId,
          '⚠️ <b>Xatolik:</b> Ushbu imzo so‘rovi topilmadi yoki uning muddati o‘tgan.',
          undefined,
          botToken
        );
      }
    } else if (text.startsWith('/start')) {
      const welcome = `Assalomu alaykum, <b>${fromName}</b>! 👋\n\n` +
        `Bu <b>Online Imzo (@Onlineimzo_bot)</b> — hujjatlarni masofadan xavfsiz va tezkor elektron imzolash boti.\n\n` +
        `Platformaga kirish yoki hujjat imzolash uchun quyidagi <b>"✍️ Mini App'ni ochish"</b> tugmasini bosing:`;

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '✍️ Mini App\'ni ochish',
              web_app: { url: appUrl }
            }
          ]
        ]
      };
      await this.sendMessageViaBot(chatId, welcome, replyMarkup, botToken);
    } else if (text === '/help' || text === 'Yordam') {
      const help = `ℹ️ <b>Yordam bo‘limi</b>\n\n` +
        `1. Yuboruvchi veb-saytda PDF hujjat yuklaydi va imzo o‘rnini belgilaydi.\n` +
        `2. Hosil bo‘lgan QR kodni yoki havolani yuboradi.\n` +
        `3. Siz telefoningizda ekran orqali imzoingizni chizib, tasdiqlaysiz.\n` +
        `4. Tayyor imzolangan PDF va audit sertifikatini yuklab olishingiz mumkin.`;
      await this.sendMessageViaBot(chatId, help, undefined, botToken);
    } else {
      const defaultReply = `Hujjatni imzolash uchun quyidagi tugmani bosing yoki yuborilgan QR kodni skanerlang:`;
      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '✍️ Imzolash platformasini ochish',
              web_app: { url: appUrl }
            }
          ]
        ]
      };
      await this.sendMessageViaBot(chatId, defaultReply, replyMarkup, botToken);
    }
  }
}
