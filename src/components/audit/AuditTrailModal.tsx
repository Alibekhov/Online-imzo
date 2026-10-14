import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLogItem } from '../../types/client';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  FileText, 
  QrCode, 
  Eye, 
  CheckCircle, 
  Download, 
  Send 
} from 'lucide-react';

interface AuditTrailModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  documentId,
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && documentId) {
      setIsLoading(true);
      api.documents.get(documentId)
        .then(res => {
          setLogs(res.audit_logs || []);
          setDocTitle(res.document.original_filename);
        })
        .catch(err => {
          console.error('Audit log fetch error:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT_UPLOADED':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'SIGNING_REQUEST_CREATED':
        return <Send className="w-4 h-4 text-indigo-600" />;
      case 'QR_GENERATED':
        return <QrCode className="w-4 h-4 text-amber-600" />;
      case 'SIGNING_PAGE_OPENED':
        return <Eye className="w-4 h-4 text-purple-600" />;
      case 'SIGNATURE_CONFIRMED':
      case 'DOCUMENT_SIGNED':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'DOCUMENT_DOWNLOADED':
        return <Download className="w-4 h-4 text-sky-600" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getEventTitle = (type: string) => {
    switch (type) {
      case 'DOCUMENT_UPLOADED':
        return 'Hujjat yuklandi';
      case 'SIGNING_REQUEST_CREATED':
        return 'Imzo so‘rovi yaratildi';
      case 'QR_GENERATED':
        return 'QR kod va xavfsiz token shakllantirildi';
      case 'SIGNING_PAGE_OPENED':
        return 'Imzolash ekrani ochildi';
      case 'SIGNATURE_CONFIRMED':
        return 'Imzo chizildi va tasdiqlandi';
      case 'DOCUMENT_SIGNED':
        return 'Hujjat to‘liq imzolandi (PDF generatsiya qilindi)';
      case 'DOCUMENT_DOWNLOADED':
        return 'Hujjat yuklab olindi';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Audit tarixi va xavfsizlik jurnali
              </h3>
              <p className="text-[11px] text-neutral-500 truncate max-w-sm">
                {docTitle || 'Hujjat ma\'lumotlari'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Jurnal yuklanmoqda...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Ushbu hujjat bo‘yicha hozircha audit hodisalari qayd etilmagan.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Dot Icon */}
                  <div className="absolute -left-[30px] top-0 w-6 h-6 rounded-full bg-white border-2 border-neutral-200 flex items-center justify-center shadow-xs">
                    {getEventIcon(log.event_type)}
                  </div>

                  <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold text-neutral-900">
                        {getEventTitle(log.event_type)}
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                        {new Date(log.created_at).toLocaleString('uz-UZ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-600">
                      <span className="text-neutral-400">Ijrochi:</span>
                      <span className="font-medium text-neutral-800">{log.actor}</span>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-neutral-200/60 text-[10px] text-neutral-500 font-mono space-y-0.5">
                        {Object.entries(log.metadata).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-neutral-400">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>O‘zgarmas (immutable) xavfsizlik audit jurnali</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-neutral-200 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
};
