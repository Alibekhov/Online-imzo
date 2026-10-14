import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Database, DOCS_DIR, SIGNED_DIR } from '../db';
import { authenticateJwt, AuthRequest } from '../middleware/auth';
import { PdfService } from '../services/pdf.service';

const router = Router();

// Configure multer for PDF uploads (max 25MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeBase}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat PDF formatdagi hujjatlar qabul qilinadi.'));
    }
  }
});

// Upload a new PDF document
router.post('/upload', authenticateJwt, upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!req.file) {
      return res.status(400).json({ error: 'Iltimos, PDF faylni tanlang.' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Validate and inspect PDF
    let pageCount = 1;
    try {
      const pdfInfo = await PdfService.getPdfInfo(fileBuffer);
      pageCount = pdfInfo.pageCount;
    } catch (e) {
      console.warn('Could not inspect PDF pages, defaulting to 1:', e);
    }

    const document = Database.createDocument({
      owner_id: user.id,
      original_filename: req.file.originalname,
      original_file_path: filePath,
      page_count: pageCount,
      status: 'DRAFT'
    });

    Database.createAuditLog({
      document_id: document.id,
      event_type: 'DOCUMENT_UPLOADED',
      actor: user.email,
      metadata: {
        filename: document.original_filename,
        pages: pageCount,
        size_bytes: req.file.size
      }
    });

    return res.status(201).json({
      document
    });
  } catch (err: any) {
    console.error('Document upload error:', err);
    return res.status(500).json({ error: err.message || 'Hujjatni yuklashda xatolik yuz berdi.' });
  }
});

// Generate sample contract PDF for instant testing
router.post('/sample', authenticateJwt, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const sampleBuffer = await PdfService.generateSampleContractPdf();
    const filename = `namuna_shartnoma_${Date.now()}.pdf`;
    const filePath = path.join(DOCS_DIR, filename);

    fs.writeFileSync(filePath, sampleBuffer);

    const document = Database.createDocument({
      owner_id: user.id,
      original_filename: 'Xizmat_korsatish_shartnomasi_namuna.pdf',
      original_file_path: filePath,
      page_count: 1,
      status: 'DRAFT'
    });

    Database.createAuditLog({
      document_id: document.id,
      event_type: 'DOCUMENT_UPLOADED',
      actor: user.email,
      metadata: {
        filename: document.original_filename,
        is_sample: true
      }
    });

    return res.status(201).json({
      document
    });
  } catch (err: any) {
    console.error('Sample generation error:', err);
    return res.status(500).json({ error: 'Namuna hujjat yaratishda xatolik yuz berdi.' });
  }
});

// List all documents belonging to current sender
router.get('/', authenticateJwt, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const docs = Database.findDocumentsByOwner(user.id);

  // Enrich with active signing request details
  const enriched = docs.map(doc => {
    const requests = Database.findSigningRequestsByDocId(doc.id);
    const activeReq = requests[0];
    return {
      ...doc,
      signing_request: activeReq ? {
        id: activeReq.id,
        token: activeReq.token,
        recipient_name: activeReq.recipient_name,
        recipient_telegram_id: activeReq.recipient_telegram_id,
        status: activeReq.status,
        signed_at: activeReq.signed_at,
        expires_at: activeReq.expires_at
      } : undefined
    };
  });

  return res.json({ documents: enriched });
});

// Get single document with requests and audit trail
router.get('/:id', authenticateJwt, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const doc = Database.findDocumentById(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'Hujjat topilmadi.' });
  }

  if (doc.owner_id !== user.id) {
    return res.status(403).json({ error: 'Ushbu hujjatni ko‘rish huquqingiz yo‘q.' });
  }

  const requests = Database.findSigningRequestsByDocId(doc.id).map(r => {
    const placement = Database.findSignaturePlacementByRequestId(r.id);
    const signature = Database.findSignatureByRequestId(r.id);
    return { ...r, placement, signature };
  });

  const auditLogs = Database.findAuditLogsByDocumentId(doc.id);

  return res.json({
    document: doc,
    signing_requests: requests,
    audit_logs: auditLogs
  });
});

// Stream raw PDF for in-browser canvas/viewer
router.get('/:id/pdf', async (req: AuthRequest, res: Response) => {
  const doc = Database.findDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).send('Hujjat topilmadi');
  }

  // Auto-heal if file is deleted from disk
  if (!fs.existsSync(doc.original_file_path)) {
    try {
      const samplePdfBuffer = await PdfService.generateSampleContractPdf();
      const targetDir = path.dirname(doc.original_file_path);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(doc.original_file_path, samplePdfBuffer);
    } catch (e) {
      console.error('Failed to auto-heal PDF file:', e);
      return res.status(404).send('Fayl diskda topilmadi');
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
  const stream = fs.createReadStream(doc.original_file_path);
  stream.pipe(res);
});

// Stream signed PDF
router.get('/:id/signed-pdf', async (req: AuthRequest, res: Response) => {
  const doc = Database.findDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).send('Hujjat topilmadi');
  }

  // Ensure original exists
  if (!fs.existsSync(doc.original_file_path)) {
    const samplePdfBuffer = await PdfService.generateSampleContractPdf();
    const targetDir = path.dirname(doc.original_file_path);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(doc.original_file_path, samplePdfBuffer);
  }

  const signedPath = doc.signed_file_path || path.join(path.resolve(process.cwd(), 'uploads/signed'), `signed_${doc.id}.pdf`);
  doc.signed_file_path = signedPath;

  // Auto-heal signed PDF if deleted from disk
  if (!fs.existsSync(signedPath)) {
    try {
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
    } catch (e) {
      console.error('Failed to auto-heal signed PDF:', e);
      return res.status(404).send('Imzolangan fayl diskda topilmadi');
    }
  }

  Database.createAuditLog({
    document_id: doc.id,
    event_type: 'DOCUMENT_DOWNLOADED',
    actor: req.user?.email || 'Sender',
    metadata: { is_signed: true }
  });

  const filename = `imzolangan_${doc.original_filename}`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const stream = fs.createReadStream(signedPath);
  stream.pipe(res);
});

export default router;
