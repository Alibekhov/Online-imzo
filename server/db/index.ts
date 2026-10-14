import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { 
  User, 
  Document, 
  SigningRequest, 
  SignaturePlacement, 
  Signature, 
  AuditLog 
} from './types';
import { PdfService } from '../services/pdf.service';

interface DatabaseData {
  users: User[];
  documents: Document[];
  signing_requests: SigningRequest[];
  signature_placements: SignaturePlacement[];
  signatures: Signature[];
  audit_logs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
export const DOCS_DIR = path.join(UPLOADS_DIR, 'documents');
export const SIGNATURES_DIR = path.join(UPLOADS_DIR, 'signatures');
export const SIGNED_DIR = path.join(UPLOADS_DIR, 'signed');
export const QR_DIR = path.join(UPLOADS_DIR, 'qr');

export class Database {
  private static data: DatabaseData = {
    users: [],
    documents: [],
    signing_requests: [],
    signature_placements: [],
    signatures: [],
    audit_logs: []
  };

  private static isInitialized = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    // Ensure all directories exist
    [DATA_DIR, UPLOADS_DIR, DOCS_DIR, SIGNATURES_DIR, SIGNED_DIR, QR_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        await this.ensureDocumentFiles();
      } catch (err) {
        console.error('Error reading database file, initializing fresh:', err);
        await this.seedInitialData();
      }
    } else {
      await this.seedInitialData();
    }

    this.isInitialized = true;
  }

  /**
   * Self-healing: if any document or signed file was removed from disk,
   * automatically recreate original PDF or reset document state to PENDING_SIGNATURE
   * so there are never dangling broken references!
   */
  public static async ensureDocumentFiles(): Promise<void> {
    for (const doc of this.data.documents) {
      // 1. Ensure original PDF exists on disk
      if (!fs.existsSync(doc.original_file_path)) {
        try {
          const samplePdfBuffer = await PdfService.generateSampleContractPdf();
          const targetDir = path.dirname(doc.original_file_path);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(doc.original_file_path, samplePdfBuffer);
        } catch (e) {
          console.error(`Auto-heal error for original file ${doc.original_file_path}:`, e);
        }
      }

      // 2. If document was marked SIGNED but signed PDF is missing on disk,
      // reset it cleanly to PENDING_SIGNATURE so user can sign it again without errors
      if (doc.status === 'SIGNED' && doc.signed_file_path && !fs.existsSync(doc.signed_file_path)) {
        doc.status = 'PENDING_SIGNATURE';
        delete doc.signed_file_path;

        const req = this.data.signing_requests.find(r => r.document_id === doc.id);
        if (req) {
          req.status = 'PENDING_SIGNATURE';
          delete req.signed_at;
        }
        this.data.signatures = this.data.signatures.filter(s => {
          return req ? s.signing_request_id !== req.id : true;
        });
      }
    }

    // 3. Ensure all pending or expired demo signing requests have an active expiry date
    for (const req of this.data.signing_requests) {
      if (req.status === 'PENDING_SIGNATURE' || req.status === 'OPENED' || req.status === 'EXPIRED') {
        req.status = 'PENDING_SIGNATURE';
        req.expires_at = new Date(Date.now() + 14 * 24 * 3600000).toISOString();
      }
    }

    for (const doc of this.data.documents) {
      if (doc.status === 'EXPIRED') {
        doc.status = 'PENDING_SIGNATURE';
      }
    }

    this.save();
  }

  private static async seedInitialData(): Promise<void> {
    const passwordHash = await bcrypt.hash('password123', 10);
    const defaultUser: User = {
      id: 'usr_demo_sender_01',
      full_name: 'Azizbek Rahimov',
      email: 'sender@example.com',
      password_hash: passwordHash,
      phone: '+998 90 123 45 67',
      created_at: new Date().toISOString()
    };

    this.data.users = [defaultUser];

    // Create a real initial sample contract PDF on disk
    try {
      const samplePdfBuffer = await PdfService.generateSampleContractPdf();
      const sampleDocFilename = `sample_shartnoma_${Date.now()}.pdf`;
      const sampleDocPath = path.join(DOCS_DIR, sampleDocFilename);
      fs.writeFileSync(sampleDocPath, samplePdfBuffer);

      const defaultDoc: Document = {
        id: 'doc_sample_01',
        owner_id: defaultUser.id,
        original_filename: 'Xizmat_korsatish_shartnomasi.pdf',
        original_file_path: sampleDocPath,
        page_count: 1,
        status: 'PENDING_SIGNATURE',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date().toISOString()
      };

      const token = crypto.randomBytes(16).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const defaultRequest: SigningRequest = {
        id: 'req_sample_01',
        document_id: defaultDoc.id,
        token,
        token_hash: tokenHash,
        recipient_name: 'Jamshid Aliyev',
        recipient_telegram_id: '@jamshid_dev',
        status: 'PENDING_SIGNATURE',
        expires_at: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString()
      };

      const defaultPlacement: SignaturePlacement = {
        id: 'plc_sample_01',
        signing_request_id: defaultRequest.id,
        page_number: 1,
        x_pct: 54,
        y_pct: 65,
        width_pct: 35,
        height_pct: 12
      };

      const initialLogs: AuditLog[] = [
        {
          id: 'log_01',
          document_id: defaultDoc.id,
          event_type: 'DOCUMENT_UPLOADED',
          actor: defaultUser.email,
          metadata: { filename: defaultDoc.original_filename },
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'log_02',
          signing_request_id: defaultRequest.id,
          document_id: defaultDoc.id,
          event_type: 'SIGNING_REQUEST_CREATED',
          actor: defaultUser.email,
          metadata: { recipient: defaultRequest.recipient_name, telegram: defaultRequest.recipient_telegram_id },
          created_at: new Date(Date.now() - 3500000).toISOString()
        },
        {
          id: 'log_03',
          signing_request_id: defaultRequest.id,
          document_id: defaultDoc.id,
          event_type: 'QR_GENERATED',
          actor: 'System',
          metadata: { tokenPrefix: token.substring(0, 6) + '...' },
          created_at: new Date(Date.now() - 3500000).toISOString()
        }
      ];

      this.data.documents = [defaultDoc];
      this.data.signing_requests = [defaultRequest];
      this.data.signature_placements = [defaultPlacement];
      this.data.audit_logs = initialLogs;

    } catch (e) {
      console.error('Failed to create sample PDF:', e);
    }

    this.save();
  }

  public static save(): void {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Database write error:', err);
    }
  }

  // Users
  static findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  static createUser(user: Omit<User, 'id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      created_at: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // Documents
  static findDocumentById(id: string): Document | undefined {
    return this.data.documents.find(d => d.id === id);
  }

  static findDocumentsByOwner(ownerId: string): Document[] {
    return this.data.documents
      .filter(d => d.owner_id === ownerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static createDocument(doc: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Document {
    const newDoc: Document = {
      ...doc,
      id: `doc_${crypto.randomBytes(8).toString('hex')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.documents.push(newDoc);
    this.save();
    return newDoc;
  }

  static updateDocument(id: string, updates: Partial<Document>): Document | undefined {
    const doc = this.data.documents.find(d => d.id === id);
    if (!doc) return undefined;
    Object.assign(doc, updates, { updated_at: new Date().toISOString() });
    this.save();
    return doc;
  }

  // Signing Requests
  static createSigningRequest(req: Omit<SigningRequest, 'id' | 'created_at'>): SigningRequest {
    const newReq: SigningRequest = {
      ...req,
      id: `req_${crypto.randomBytes(8).toString('hex')}`,
      created_at: new Date().toISOString()
    };
    this.data.signing_requests.push(newReq);
    this.save();
    return newReq;
  }

  static findSigningRequestById(id: string): SigningRequest | undefined {
    return this.data.signing_requests.find(r => r.id === id);
  }

  static findSigningRequestByToken(token: string): SigningRequest | undefined {
    return this.data.signing_requests.find(r => r.token === token);
  }

  static findSigningRequestsByDocId(documentId: string): SigningRequest[] {
    return this.data.signing_requests.filter(r => r.document_id === documentId);
  }

  static updateSigningRequest(id: string, updates: Partial<SigningRequest>): SigningRequest | undefined {
    const req = this.data.signing_requests.find(r => r.id === id);
    if (!req) return undefined;
    Object.assign(req, updates);
    this.save();
    return req;
  }

  // Signature Placements
  static createSignaturePlacement(placement: Omit<SignaturePlacement, 'id'>): SignaturePlacement {
    const newPlacement: SignaturePlacement = {
      ...placement,
      id: `plc_${crypto.randomBytes(8).toString('hex')}`
    };
    this.data.signature_placements.push(newPlacement);
    this.save();
    return newPlacement;
  }

  static findSignaturePlacementByRequestId(signingRequestId: string): SignaturePlacement | undefined {
    return this.data.signature_placements.find(p => p.signing_request_id === signingRequestId);
  }

  // Signatures
  static createSignature(sig: Omit<Signature, 'id' | 'signed_at'>): Signature {
    const newSig: Signature = {
      ...sig,
      id: `sig_${crypto.randomBytes(8).toString('hex')}`,
      signed_at: new Date().toISOString()
    };
    this.data.signatures.push(newSig);
    this.save();
    return newSig;
  }

  static findSignatureByRequestId(signingRequestId: string): Signature | undefined {
    return this.data.signatures.find(s => s.signing_request_id === signingRequestId);
  }

  // Audit Logs
  static createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `log_${crypto.randomBytes(8).toString('hex')}`,
      created_at: new Date().toISOString()
    };
    this.data.audit_logs.push(newLog);
    this.save();
    return newLog;
  }

  static findAuditLogsByRequestId(signingRequestId: string): AuditLog[] {
    return this.data.audit_logs
      .filter(l => l.signing_request_id === signingRequestId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  static findAuditLogsByDocumentId(documentId: string): AuditLog[] {
    return this.data.audit_logs
      .filter(l => l.document_id === documentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
}
