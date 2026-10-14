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
  phone?: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  owner_id: string;
  original_filename: string;
  original_file_path: string;
  signed_file_path?: string;
  page_count: number;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  signing_request?: {
    id: string;
    token: string;
    recipient_name: string;
    recipient_telegram_id?: string;
    status: DocumentStatus;
    signed_at?: string;
    expires_at: string;
  };
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

export interface SigningRequestItem {
  id: string;
  document_id: string;
  token: string;
  recipient_name: string;
  recipient_telegram_id?: string;
  status: DocumentStatus;
  expires_at: string;
  created_at: string;
  signed_at?: string;
  placement?: SignaturePlacement;
  signature?: {
    signer_name?: string;
    signed_at: string;
  };
}

export interface AuditLogItem {
  id: string;
  signing_request_id?: string;
  document_id?: string;
  event_type: string;
  actor: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SigningInfoResponse {
  request: {
    id: string;
    token: string;
    status: DocumentStatus;
    recipient_name: string;
    recipient_telegram_id?: string;
    expires_at: string;
    signed_at?: string;
    created_at: string;
  };
  document: {
    id: string;
    title: string;
    page_count: number;
    sender_name: string;
  };
  placement?: SignaturePlacement;
  signature?: {
    signer_name?: string;
    signed_at: string;
  };
  qr: {
    dataUrl: string;
    telegramDeepLink: string;
    webDirectLink: string;
    targetUrl: string;
  };
}
