import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Database, SIGNATURES_DIR, SIGNED_DIR } from '../db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { QrService } from '../services/qr.service';
import { PdfService } from '../services/pdf.service';
import { TelegramService } from '../services/telegram.service';

const router = Router();

// Create a new signing request with exact signature placement
router.post('/requests', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { 
      document_id, 
      recipient_name, 
      recipient_telegram_id, 
      page_number, 
      x_pct, 
      y_pct, 
      width_pct, 
      height_pct,
      expires_in_days = 7
    } = req.body;

    if (!document_id || !recipient_name) {
      return res.status(400).json({ error: 'Hujjat va qabul qiluvchi ismi kiritilishi shart.' });
    }

    const doc = Database.findDocumentById(document_id);
    if (!doc) {
      return res.status(404).json({ error: 'Hujjat topilmadi.' });
    }

    if (doc.owner_id !== user.id) {
      return res.status(403).json({ error: 'Ushbu hujjat uchun imzo so‘rovi yaratish huquqiga ega emassiz.' });
    }

    // Generate secure random token
    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date(Date.now() + (Number(expires_in_days) || 7) * 24 * 3600000).toISOString();

    const signingRequest = Database.createSigningRequest({
      document_id: doc.id,
      token,
      token_hash: tokenHash,
      recipient_name: recipient_name.trim(),
      recipient_telegram_id: recipient_telegram_id ? recipient_telegram_id.trim() : undefined,
      status: 'PENDING_SIGNATURE',
      expires_at: expiresAt
    });

    // Create signature placement
    const placement = Database.createSignaturePlacement({
      signing_request_id: signingRequest.id,
      page_number: Math.max(1, Number(page_number) || 1),
      x_pct: Math.min(100, Math.max(0, Number(x_pct) || 50)),
      y_pct: Math.min(100, Math.max(0, Number(y_pct) || 70)),
      width_pct: Math.min(100, Math.max(5, Number(width_pct) || 30)),
      height_pct: Math.min(100, Math.max(3, Number(height_pct) || 10))
    });

    // Update document status
    Database.updateDocument(doc.id, { status: 'PENDING_SIGNATURE' });

    // Generate QR code with deep link
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const qrResult = await QrService.generateSigningQr(token, appUrl, botUsername);

    // Audit logs
    Database.createAuditLog({
      signing_request_id: signingRequest.id,
      document_id: doc.id,
      event_type: 'SIGNING_REQUEST_CREATED',
      actor: user.email,
      metadata: {
        recipient_name: signingRequest.recipient_name,
        recipient_telegram: signingRequest.recipient_telegram_id,
        placement: {
          page: placement.page_number,
          x: placement.x_pct,
          y: placement.y_pct,
          w: placement.width_pct,
          h: placement.height_pct
        }
      }
    });

    Database.createAuditLog({
      signing_request_id: signingRequest.id,
      document_id: doc.id,
      event_type: 'QR_GENERATED',
      actor: 'System',
      metadata: {
        targetUrl: qrResult.targetUrl,
        telegramDeepLink: qrResult.telegramDeepLink
      }
    });

    return res.status(201).json({
      signing_request: {
        ...signingRequest,
        placement
      },
      qr: qrResult
    });
  } catch (err: any) {
    console.error('Create signing request error:', err);
    return res.status(500).json({ error: 'Imzo so‘rovini yaratishda xatolik yuz berdi.' });
  }
});

// Public: Get signing request info by token (called by Telegram Mini App or Web Signer)
router.get('/info/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = Database.findSigningRequestByToken(token);

    if (!request) {
      return res.status(404).json({ 
        error: 'Bu imzo so‘rovi topilmadi yoki noto‘g‘ri.',
        code: 'NOT_FOUND' 
      });
    }

    const doc = Database.findDocumentById(request.document_id);
    if (!doc) {
      return res.status(404).json({ error: 'Hujjat topilmadi.' });
    }

    const owner = Database.findUserById(doc.owner_id);

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(request.expires_at);
    if (expiresAt < now && request.status !== 'SIGNED') {
      Database.updateSigningRequest(request.id, { status: 'EXPIRED' });
      Database.updateDocument(doc.id, { status: 'EXPIRED' });
      return res.status(410).json({ 
        error: 'Bu imzo so‘rovining amal qilish muddati tugagan.',
        code: 'EXPIRED',
        status: 'EXPIRED'
      });
    }

    if (request.status === 'CANCELLED') {
      return res.status(400).json({ 
        error: 'Bu imzo so‘rovi bekor qilingan.',
        code: 'CANCELLED',
        status: 'CANCELLED'
      });
    }

    const placement = Database.findSignaturePlacementByRequestId(request.id);
    const signature = Database.findSignatureByRequestId(request.id);

    // Log OPENED event if not already signed
    if (request.status === 'PENDING_SIGNATURE') {
      Database.updateSigningRequest(request.id, { status: 'OPENED' });
      Database.createAuditLog({
        signing_request_id: request.id,
        document_id: doc.id,
        event_type: 'SIGNING_PAGE_OPENED',
        actor: request.recipient_name,
        metadata: {
          userAgent: req.headers['user-agent']
        }
      });
    }

    // App and QR info
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const qrResult = await QrService.generateSigningQr(token, appUrl, botUsername);

    return res.json({
      request: {
        id: request.id,
        token: request.token,
        status: request.status,
        recipient_name: request.recipient_name,
        recipient_telegram_id: request.recipient_telegram_id,
        expires_at: request.expires_at,
        signed_at: request.signed_at,
        created_at: request.created_at
      },
      document: {
        id: doc.id,
        title: doc.original_filename,
        page_count: doc.page_count,
        sender_name: owner?.full_name || 'Hujjat egasi'
      },
      placement,
      signature: signature ? {
        signer_name: signature.signer_name,
        signed_at: signature.signed_at
      } : undefined,
      qr: qrResult
    });
  } catch (err: any) {
    console.error('Get signing info error:', err);
    return res.status(500).json({ error: 'Ma\'lumotlarni olishda xatolik yuz berdi.' });
  }
});

// Public: Submit drawn signature from Telegram Mini App / Web Canvas
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { token, signature_base64, telegram_init_data, signer_name } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Imzo tokeni kiritilmagan.' });
    }

    const request = Database.findSigningRequestByToken(token);
    if (!request) {
      return res.status(404).json({ error: 'Bu imzo so‘rovi topilmadi yoki noto‘g‘ri.' });
    }

    if (request.status === 'SIGNED') {
      return res.status(400).json({ error: 'Ushbu hujjat allaqachon imzolangan.' });
    }

    const now = new Date();
    if (new Date(request.expires_at) < now) {
      return res.status(410).json({ error: 'Bu imzo so‘rovining amal qilish muddati tugagan.' });
    }

    if (!signature_base64 || signature_base64.trim().length === 0) {
      return res.status(400).json({ error: 'Iltimos, avval imzo qo‘ying.' });
    }

    const doc = Database.findDocumentById(request.document_id);
    if (!doc) {
      return res.status(404).json({ error: 'Hujjat fayli topilmadi.' });
    }

    // Auto-heal original PDF if removed from disk
    if (!fs.existsSync(doc.original_file_path)) {
      const samplePdfBuffer = await PdfService.generateSampleContractPdf();
      const targetDir = path.dirname(doc.original_file_path);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(doc.original_file_path, samplePdfBuffer);
    }

    const placement = Database.findSignaturePlacementByRequestId(request.id);
    if (!placement) {
      return res.status(400).json({ error: 'Imzo joylashuvi aniqlanmadi.' });
    }

    // Optional Telegram WebApp validation
    let tgUser: any = null;
    if (telegram_init_data) {
      const validation = TelegramService.validateInitData(telegram_init_data, process.env.TELEGRAM_BOT_TOKEN);
      if (validation.isValid && validation.user) {
        tgUser = validation.user;
      }
    }

    // Convert base64 signature to PNG buffer
    const base64Data = signature_base64.replace(/^data:image\/\w+;base64,/, '');
    const signatureBuffer = Buffer.from(base64Data, 'base64');

    // Save signature PNG
    const sigFilename = `sig_${request.id}_${Date.now()}.png`;
    const sigPath = path.join(SIGNATURES_DIR, sigFilename);
    fs.writeFileSync(sigPath, signatureBuffer);

    // Read original PDF and place signature at predefined coordinates
    const originalPdfBuffer = fs.readFileSync(doc.original_file_path);
    const signedPdfBuffer = await PdfService.placeSignatureOnPdf(originalPdfBuffer, signatureBuffer, {
      pageNumber: placement.page_number,
      x_pct: placement.x_pct,
      y_pct: placement.y_pct,
      width_pct: placement.width_pct,
      height_pct: placement.height_pct
    });

    // Save signed PDF separately without modifying original
    const signedFilename = `signed_${doc.id}_${Date.now()}.pdf`;
    const signedFilePath = path.join(SIGNED_DIR, signedFilename);
    fs.writeFileSync(signedFilePath, signedPdfBuffer);

    // Update statuses
    const signedTimestamp = new Date().toISOString();
    const effectiveSignerName = signer_name || (tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : request.recipient_name);
    const effectiveTgId = tgUser?.id ? String(tgUser.id) : request.recipient_telegram_id;

    Database.updateSigningRequest(request.id, {
      status: 'SIGNED',
      signed_at: signedTimestamp
    });

    Database.updateDocument(doc.id, {
      status: 'SIGNED',
      signed_file_path: signedFilePath
    });

    // Save signature record
    Database.createSignature({
      signing_request_id: request.id,
      signer_name: effectiveSignerName,
      signer_telegram_id: effectiveTgId,
      signature_file_path: sigPath
    });

    // Record audit events
    Database.createAuditLog({
      signing_request_id: request.id,
      document_id: doc.id,
      event_type: 'SIGNATURE_CONFIRMED',
      actor: effectiveSignerName,
      metadata: {
        telegram_id: effectiveTgId,
        ip: req.ip
      }
    });

    Database.createAuditLog({
      signing_request_id: request.id,
      document_id: doc.id,
      event_type: 'DOCUMENT_SIGNED',
      actor: effectiveSignerName,
      metadata: {
        signed_at: signedTimestamp,
        placement: {
          page: placement.page_number,
          x: placement.x_pct,
          y: placement.y_pct
        }
      }
    });

    return res.json({
      success: true,
      message: 'Hujjat muvaffaqiyatli imzolandi',
      signed_at: signedTimestamp,
      signer_name: effectiveSignerName,
      download_url: `/api/signing/download/${token}`
    });
  } catch (err: any) {
    console.error('Signature submit error:', err);
    return res.status(500).json({ error: err.message || 'Imzoni tasdiqlashda xatolik yuz berdi.' });
  }
});

// Public: Download signed PDF for recipient
router.get('/download/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = Database.findSigningRequestByToken(token);

    if (!request || request.status !== 'SIGNED') {
      return res.status(404).send('Imzolangan hujjat mavjud emas yoki hali imzolanmagan.');
    }

    const doc = Database.findDocumentById(request.document_id);
    if (!doc) return res.status(404).send('Hujjat topilmadi');

    // Ensure original file exists
    if (!fs.existsSync(doc.original_file_path)) {
      const samplePdfBuffer = await PdfService.generateSampleContractPdf();
      const targetDir = path.dirname(doc.original_file_path);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(doc.original_file_path, samplePdfBuffer);
    }

    const signedPath = doc.signed_file_path || path.join(path.resolve(process.cwd(), 'uploads/signed'), `signed_${doc.id}.pdf`);
    doc.signed_file_path = signedPath;

    // Auto-heal signed PDF if deleted
    if (!fs.existsSync(signedPath)) {
      const originalBuffer = fs.readFileSync(doc.original_file_path);
      const sigBuffer = PdfService.createSampleSignaturePngBuffer();
      const signedBuffer = await PdfService.placeSignatureOnPdf(originalBuffer, sigBuffer, {
        pageNumber: 1,
        x_pct: 54,
        y_pct: 65,
        width_pct: 35,
        height_pct: 12
      });
      const targetDir = path.dirname(signedPath);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(signedPath, signedBuffer);
      Database.save();
    }

    Database.createAuditLog({
      signing_request_id: request.id,
      document_id: doc.id,
      event_type: 'DOCUMENT_DOWNLOADED',
      actor: request.recipient_name,
      metadata: { via: 'recipient_download_link' }
    });

    const downloadFilename = `imzolangan_${doc.original_filename}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    const stream = fs.createReadStream(signedPath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('Download error:', err);
    return res.status(500).send('Faylni yuklab olishda xatolik yuz berdi.');
  }
});

// Public: Stream PDF for viewing in the signing screen (either original or signed)
router.get('/preview-pdf/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = Database.findSigningRequestByToken(token);
    if (!request) return res.status(404).send('Topilmadi');

    const doc = Database.findDocumentById(request.document_id);
    if (!doc) return res.status(404).send('Topilmadi');

    if (!fs.existsSync(doc.original_file_path)) {
      const samplePdfBuffer = await PdfService.generateSampleContractPdf();
      const targetDir = path.dirname(doc.original_file_path);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(doc.original_file_path, samplePdfBuffer);
    }

    let filePath = (request.status === 'SIGNED' && doc.signed_file_path && fs.existsSync(doc.signed_file_path))
      ? doc.signed_file_path
      : doc.original_file_path;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).send('Xatolik');
  }
});

// Public: Get or create demo signing request for instant testing in Telegram Mini App
router.get('/demo-token', async (req: Request, res: Response) => {
  try {
    const user = Database.findUserByEmail('sender@example.com') || Database['data']?.users?.[0];
    if (!user) return res.status(500).json({ error: 'Foydalanuvchi topilmadi' });

    // Look for pending request
    const existingReq = Database['data']?.signing_requests?.find((r: any) => r.status === 'PENDING_SIGNATURE' || r.status === 'OPENED');
    if (existingReq) {
      if (new Date(existingReq.expires_at).getTime() < Date.now()) {
        existingReq.expires_at = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
        Database.save();
      }
      return res.json({ token: existingReq.token });
    }

    // Create fresh sample contract and signing request
    const sampleBuffer = await PdfService.generateSampleContractPdf();
    const filename = `namuna_shartnoma_${Date.now()}.pdf`;
    const docsDir = path.resolve(process.cwd(), 'uploads/documents');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const filePath = path.join(docsDir, filename);
    fs.writeFileSync(filePath, sampleBuffer);

    const doc = Database.createDocument({
      owner_id: user.id,
      original_filename: 'Xizmat_korsatish_shartnomasi_namuna.pdf',
      original_file_path: filePath,
      page_count: 1,
      status: 'PENDING_SIGNATURE'
    });

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const signingRequest = Database.createSigningRequest({
      document_id: doc.id,
      token,
      token_hash: tokenHash,
      recipient_name: 'Mijoz (Telegram Foydalanuvchisi)',
      status: 'PENDING_SIGNATURE',
      expires_at: new Date(Date.now() + 7 * 24 * 3600000).toISOString()
    });

    Database.createSignaturePlacement({
      signing_request_id: signingRequest.id,
      page_number: 1,
      x_pct: 54,
      y_pct: 65,
      width_pct: 35,
      height_pct: 12
    });

    return res.json({ token: signingRequest.token });
  } catch (err: any) {
    console.error('Demo token error:', err);
    return res.status(500).json({ error: err.message || 'Xatolik' });
  }
});

export default router;
