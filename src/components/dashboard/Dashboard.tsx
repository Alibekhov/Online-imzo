import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DocumentItem } from '../../types/client';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Search, 
  QrCode, 
  Download, 
  History, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  AlertCircle 
} from 'lucide-react';

interface DashboardProps {
  onOpenUpload: () => void;
  onOpenSample: () => void;
  onSelectDocumentForPlacement: (doc: DocumentItem) => void;
  onShowQr: (signingRequest: any, qr: any) => void;
  onShowAudit: (documentId: string) => void;
  onOpenSignerScreen: (token: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenUpload,
  onOpenSample,
  onSelectDocumentForPlacement,
  onShowQr,
  onShowAudit,
  onOpenSignerScreen
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'signed' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.documents.list();
      setDocuments(res.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Filter and search
  const filteredDocuments = documents.filter(doc => {
    // Filter status
    if (filter === 'pending' && doc.status !== 'PENDING_SIGNATURE' && doc.status !== 'OPENED') return false;
    if (filter === 'signed' && doc.status !== 'SIGNED') return false;
    if (filter === 'draft' && doc.status !== 'DRAFT') return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.original_filename.toLowerCase().includes(q);
      const matchRecipient = doc.signing_request?.recipient_name?.toLowerCase().includes(q);
      const matchTg = doc.signing_request?.recipient_telegram_id?.toLowerCase().includes(q);
      return matchName || matchRecipient || matchTg;
    }
    return true;
  });

  // Calculate statistics
  const totalCount = documents.length;
  const pendingCount = documents.filter(d => d.status === 'PENDING_SIGNATURE' || d.status === 'OPENED').length;
  const signedCount = documents.filter(d => d.status === 'SIGNED').length;
  const draftCount = documents.filter(d => d.status === 'DRAFT').length;

  const handleShowQrForDoc = async (doc: DocumentItem) => {
    if (!doc.signing_request?.token) return;
    try {
      const info = await api.signing.getInfo(doc.signing_request.token);
      onShowQr(info.request, info.qr);
    } catch (err) {
      console.error('Failed to get QR info:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Hujjatlar boshqaruvi
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            PDF yuklang, imzo joyini belgilang va Telegram orqali imzolating
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSample}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Namuna shartnoma bilan sinash</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Hujjat yuklash (PDF)</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500">Jami hujjatlar</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1 font-mono tabular-nums">
            {totalCount}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs font-medium text-amber-600">Imzo kutilmoqda</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1 font-mono tabular-nums">
            {pendingCount}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs font-medium text-emerald-600">Imzolangan</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1 font-mono tabular-nums">
            {signedCount}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500">Qoralamalar</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1 font-mono tabular-nums">
            {draftCount}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        
        {/* Interactive Segmented Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-neutral-200 self-start">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Barchasi ({totalCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'pending' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Kutilmoqda ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('signed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'signed' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Imzolangan ({signedCount})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'draft' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Qoralama ({draftCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hujjat yoki imzolovchini izlash..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

      </div>

      {/* High-Density Data Grid / Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        
        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400">
            Hujjatlar yuklanmoqda...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-800">
              Hech qanday hujjat topilmadi
            </h4>
            <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-5">
              Yangi PDF hujjat yuklang yoki bir tugma orqali namunaviy shartnomani sinab ko‘ring.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onOpenSample}
                className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium rounded-lg transition-colors"
              >
                Namuna yaratish
              </button>
              <button
                onClick={onOpenUpload}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                PDF yuklash
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-medium">
                <tr>
                  <th className="px-5 py-3">Hujjat nomi</th>
                  <th className="px-4 py-3">Holati</th>
                  <th className="px-4 py-3">Qabul qiluvchi</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-5 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredDocuments.map((doc) => {
                  const isSigned = doc.status === 'SIGNED';
                  const isPending = doc.status === 'PENDING_SIGNATURE' || doc.status === 'OPENED';
                  const isDraft = doc.status === 'DRAFT';

                  return (
                    <tr key={doc.id} className="hover:bg-neutral-50/80 transition-colors">
                      
                      {/* Document Name */}
                      <td className="px-5 py-3.5 font-medium text-neutral-900">
                        <div className="flex items-center gap-2.5">
                          <FileText className={`w-4 h-4 shrink-0 ${isSigned ? 'text-emerald-600' : 'text-blue-600'}`} />
                          <span className="truncate max-w-[240px] sm:max-w-xs" title={doc.original_filename}>
                            {doc.original_filename}
                          </span>
                        </div>
                      </td>

                      {/* Status (Unboxed text with subtle indicator, anti-pill discipline) */}
                      <td className="px-4 py-3.5">
                        {isSigned ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Imzolangan
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Imzo kutilmoqda
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-neutral-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                            Qoralama
                          </span>
                        )}
                      </td>

                      {/* Recipient */}
                      <td className="px-4 py-3.5 text-neutral-600">
                        {doc.signing_request ? (
                          <div className="truncate max-w-[180px]">
                            <span className="font-medium text-neutral-800 block truncate">
                              {doc.signing_request.recipient_name}
                            </span>
                            {doc.signing_request.recipient_telegram_id && (
                              <span className="text-[11px] text-blue-600 font-mono block truncate">
                                {doc.signing_request.recipient_telegram_id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">Belgilanmagan</span>
                        )}
                      </td>

                      {/* Date (Tabular figures) */}
                      <td className="px-4 py-3.5 text-neutral-500 font-mono tabular-nums whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString('uz-UZ', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* If DRAFT: button to place signature */}
                          {isDraft && (
                            <button
                              onClick={() => onSelectDocumentForPlacement(doc)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Imzo joyini belgilash</span>
                            </button>
                          )}

                          {/* If PENDING or SIGNED: show QR Code button */}
                          {doc.signing_request && (
                            <button
                              onClick={() => handleShowQrForDoc(doc)}
                              title="QR kodni ko‘rish"
                              className="p-1.5 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick test signer view if pending */}
                          {isPending && doc.signing_request && (
                            <button
                              onClick={() => onOpenSignerScreen(doc.signing_request!.token)}
                              title="Imzolash oynasini ochish (Test)"
                              className="px-2 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Imzolash</span>
                            </button>
                          )}

                          {/* If SIGNED: Download signed document */}
                          {isSigned && (
                            <a
                              href={api.documents.getSignedPdfUrl(doc.id)}
                              download={`imzolangan_${doc.original_filename}`}
                              title="Imzolangan PDF yuklab olish"
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Imzolangan PDF</span>
                            </a>
                          )}

                          {/* Audit trail */}
                          <button
                            onClick={() => onShowAudit(doc.id)}
                            title="Audit tarixini ko‘rish"
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
