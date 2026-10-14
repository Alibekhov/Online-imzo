export type EnvelopeStatus = 
  | 'draft'
  | 'needs_my_signature'
  | 'waiting_for_others'
  | 'completed'
  | 'voided'
  | 'declined';

export type RecipientRole = 'signer' | 'viewer' | 'in_person';

export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: RecipientRole;
  order: number;
  color: string;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
  signedAt?: string;
  viewedAt?: string;
  accessCode?: string;
}

export type FieldType = 
  | 'signature'
  | 'initials'
  | 'date'
  | 'name'
  | 'email'
  | 'text'
  | 'checkbox'
  | 'company'
  | 'title';

export interface DocumentField {
  id: string;
  type: FieldType;
  pageNumber: number;
  x: number; // percentage (0 - 100) or pixel
  y: number; // percentage (0 - 100) or pixel
  width: number; // percentage or pixel
  height: number; // percentage or pixel
  recipientId: string;
  required: boolean;
  value?: string;
  label?: string;
  placeholder?: string;
  signedBy?: {
    name: string;
    signatureDataUrl?: string;
    typedFont?: string;
    timestamp: string;
    ipAddress: string;
  };
}

export interface DocumentPage {
  pageNumber: number;
  title: string;
  paragraphs: string[];
  footerText?: string;
}

export interface EnvelopeDocument {
  id: string;
  title: string;
  pages: DocumentPage[];
  customPdfUrl?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  ipAddress: string;
  userAgent?: string;
  details: string;
  securityHash?: string;
}

export interface Envelope {
  id: string;
  title: string;
  status: EnvelopeStatus;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  document: EnvelopeDocument;
  recipients: Recipient[];
  fields: DocumentField[];
  auditTrail: AuditEvent[];
  securityFingerprint: string;
  expiresAt?: string;
  remindersEnabled: boolean;
}

export interface SignatureSettings {
  name: string;
  initials: string;
  mode: 'draw' | 'type' | 'upload';
  drawnDataUrl?: string;
  typedFont: string;
  uploadedDataUrl?: string;
  penColor: string;
}
