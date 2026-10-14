import QRCode from 'qrcode';

export interface QrResult {
  dataUrl: string;
  telegramDeepLink: string;
  webDirectLink: string;
  targetUrl: string;
}

export class QrService {
  /**
   * Generates a QR code for a given signing token.
   * If a Telegram Bot username is configured, points directly to the Telegram bot deep-link:
   * https://t.me/<BOT_USERNAME>?start=sign_<TOKEN>
   * Also returns the fallback direct web URL.
   */
  static async generateSigningQr(token: string, appUrl: string, botUsername?: string): Promise<QrResult> {
    const cleanAppUrl = (appUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const webDirectLink = `${cleanAppUrl}/sign/${token}`;
    
    let telegramDeepLink = '';
    let targetUrl = webDirectLink;

    if (botUsername && botUsername.trim().length > 0) {
      const cleanBotName = botUsername.replace(/^@/, '').trim();
      telegramDeepLink = `https://t.me/${cleanBotName}?start=sign_${token}`;
      targetUrl = telegramDeepLink;
    } else {
      // In local dev without bot username, default to web direct link which opens the Mini App signing screen
      targetUrl = webDirectLink;
    }

    const dataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return {
      dataUrl,
      telegramDeepLink,
      webDirectLink,
      targetUrl
    };
  }
}
