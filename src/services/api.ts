import { 
  User, 
  DocumentItem, 
  SigningRequestItem, 
  AuditLogItem, 
  SigningInfoResponse 
} from '../types/client';

const API_BASE = '/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('docsign_token');
  }

  setToken(token: string) {
    localStorage.setItem('docsign_token', token);
  }

  clearToken() {
    localStorage.removeItem('docsign_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    const token = this.getToken();

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMessage = 'So‘rovni bajarishda xatolik yuz berdi';
      try {
        const errorJson = await res.json();
        errorMessage = errorJson.error || errorMessage;
      } catch {
        const text = await res.text();
        if (text) errorMessage = text;
      }
      throw new Error(errorMessage);
    }

    return res.json() as Promise<T>;
  }

  // Auth API
  auth = {
    register: (data: { full_name: string; email: string; password: string; phone?: string }) => {
      return this.request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    login: (data: { email: string; password: string }) => {
      return this.request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    getMe: () => {
      return this.request<{ user: User }>('/auth/me');
    }
  };

  // Documents API
  documents = {
    list: () => {
      return this.request<{ documents: DocumentItem[] }>('/documents');
    },

    get: (id: string) => {
      return this.request<{ 
        document: DocumentItem; 
        signing_requests: SigningRequestItem[]; 
        audit_logs: AuditLogItem[] 
      }>(`/documents/${id}`);
    },

    upload: (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      return this.request<{ document: DocumentItem }>('/documents/upload', {
        method: 'POST',
        body: formData
      });
    },

    createSample: () => {
      return this.request<{ document: DocumentItem }>('/documents/sample', {
        method: 'POST'
      });
    },

    getPdfUrl: (id: string) => `${API_BASE}/documents/${id}/pdf`,
    getSignedPdfUrl: (id: string) => `${API_BASE}/documents/${id}/signed-pdf`
  };

  // Signing API
  signing = {
    createRequest: (data: {
      document_id: string;
      recipient_name: string;
      recipient_telegram_id?: string;
      page_number: number;
      x_pct: number;
      y_pct: number;
      width_pct: number;
      height_pct: number;
      expires_in_days?: number;
    }) => {
      return this.request<{
        signing_request: SigningRequestItem;
        qr: {
          dataUrl: string;
          telegramDeepLink: string;
          webDirectLink: string;
          targetUrl: string;
        };
      }>('/signing/requests', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    getInfo: (token: string) => {
      return this.request<SigningInfoResponse>(`/signing/info/${token}`);
    },

    submit: (data: {
      token: string;
      signature_base64: string;
      telegram_init_data?: string;
      signer_name?: string;
    }) => {
      return this.request<{
        success: boolean;
        message: string;
        signed_at: string;
        signer_name: string;
        download_url: string;
      }>('/signing/submit', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    getDownloadUrl: (token: string) => `${API_BASE}/signing/download/${token}`,
    getPreviewPdfUrl: (token: string) => `${API_BASE}/signing/preview-pdf/${token}`,
    getMyDocuments: () => {
      return this.request<{ documents: any[] }>('/signing/my-documents');
    }
  };

  // Telegram API
  telegram = {
    getStatus: () => {
      return this.request<{
        configured: boolean;
        bot_username: string | null;
        app_url: string;
        message: string;
      }>('/telegram/status');
    }
  };
}

export const api = new ApiService();
