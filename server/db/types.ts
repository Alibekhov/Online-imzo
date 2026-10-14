export type DocumentStatus = 
  | 'DRAFT' 
  | 'PENDING_SIGNATURE' 
  | 'OPENED' 
  | 'SIGNED' 
  | 'EXPIRED' 
  | 'CANCELLED';

export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  phone?: string;
  created_at: string;
}

export interface Document {
  id: string;
  owner_id: string;
  original_filename: string;
  original_file_path: string;
  signed_file_path?: string;
  page_count: number;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface SignaturePlacement {
  id: string;
  signing_request_id: string;
  page_number: number;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
}

export interface SigningRequest {
  id: string;
  document_id: string;
  token_hash: string;
  token: string;
  recipient_name: string;
  recipient_telegram_id?: string;
  status: DocumentStatus;
  expires_at: string;
  created_at: string;
  signed_at?: string;
  placement?: SignaturePlacement;
}

export interface Signature {
  id: string;
  signing_request_id: string;
  signer_telegram_id?: string;
  signer_name?: string;
  signature_file_path: string;
  signed_at: string;
}

export type AuditEventType = 
  | 'DOCUMENT_UPLOADED'
  | 'SIGNING_REQUEST_CREATED'
  | 'QR_GENERATED'
  | 'SIGNING_PAGE_OPENED'
  | 'SIGNATURE_CREATED'
  | 'SIGNATURE_CONFIRMED'
  | 'DOCUMENT_SIGNED'
  | 'DOCUMENT_DOWNLOADED'
  | 'SIGNING_REQUEST_CANCELLED';

export interface AuditLog {
  id: string;
  signing_request_id?: string;
  document_id?: string;
  event_type: AuditEventType;
  actor: string;
  metadata?: Record<string, any>;
  created_at: string;
}
