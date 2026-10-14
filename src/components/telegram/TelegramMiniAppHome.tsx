import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  User as UserIcon, 
  QrCode, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download, 
  Eye, 
  Camera, 
  ShieldCheck, 
  ExternalLink,
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';

interface TelegramMiniAppHomeProps {
  onOpenSigner: (token: string) => void;
  onOpenDesktopMode?: () => void;
}

export const TelegramMiniAppHome: React.FC<TelegramMiniAppHomeProps> = ({
  onOpenSigner,
  onOpenDesktopMode
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'signed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Get Telegram WebApp user details
  const tgWebApp = (window as any).Telegram?.WebApp;
  const tgUser = tgWebApp?.initDataUnsafe?.user;

  const displayName = tgUser 
    ? `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() 
    : 'Avtosoz Support';
  
  const displayUsername = tgUser?.username 
    ? `@${tgUser.username}` 
    : '@avtosoz_support';

  const displayId = tgUser?.id || '5734781890';
  const avatarLetter = (displayName[0] || 'A').toUpperCase();

  // Load documents
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.signing.getMyDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      console.error('Failed to load my-documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Expand Telegram WebApp if inside Telegram
    try {
      if (tgWebApp) {
        tgWebApp.ready();
        tgWebApp.expand();
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Handle Telegram native QR code scanner
  const handleScanQr = () => {
    setScanError(null);
    if (tgWebApp && typeof tgWebApp.showScanQrPopup === 'function') {
      tgWebApp.showScanQrPopup(
        { text: 'Imzolash uchun shartnoma QR kodini skanerlang' },
        (scannedText: string) => {
          if (!scannedText) return false;
          tgWebApp.closeScanQrPopup();

          // Extract token from QR link or plain token
          let extractedToken = scannedText.trim();
          if (extractedToken.includes('/sign/')) {
            extractedToken = extractedToken.split('/sign/')[1]?.split('?')[0]?.split('#')[0] || '';
          } else if (extractedToken.includes('start=sign_')) {
            extractedToken = extractedToken.split('start=sign_')[1]?.split('&')[0] || '';
          } else if (extractedToken.startsWith('sign_')) {
            extractedToken = extractedToken.replace('sign_', '');
          }

          if (extractedToken) {
            onOpenSigner(extractedToken);
            return true;
          } else {
            setScanError('QR koddan imzo havolasi topilmadi.');
            return false;
          }
        }
      );
    } else {
      // Fallback modal if browser doesn't have native Telegram scanner
      setShowManualModal(true);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let token = manualTokenInput.trim();
    if (!token) return;

    if (token.includes('/sign/')) {
      token = token.split('/sign/')[1]?.split('?')[0]?.split('#')[0] || '';
    } else if (token.includes('start=sign_')) {
      token = token.split('start=sign_')[1]?.split('&')[0] || '';
    } else if (token.startsWith('sign_')) {
      token = token.replace('sign_', '');
    }

    if (token) {
      setShowManualModal(false);
      onOpenSigner(token);
    }
  };

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'signed' ? doc.status === 'SIGNED' :
      doc.status === 'PENDING_SIGNATURE' || doc.status === 'OPENED';

    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.sender_name && doc.sender_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const signedCount = documents.filter(d => d.status === 'SIGNED').length;
  const pendingCount = documents.filter(d => d.status === 'PENDING_SIGNATURE' || d.status === 'OPENED').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col pb-12">
      
      {/* Top Header & Telegram Profile Section */}
      <div className="bg-gradient-to-b from-blue-950/40 via-neutral-900 to-neutral-950 border-b border-neutral-800/80 px-4 pt-5 pb-5">
        <div className="max-w-md mx-auto space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-sm font-bold tracking-tight text-neutral-200">
                Online Imzo · Telegram Mini App
              </h1>
            </div>
            {onOpenDesktopMode && (
              <button
                onClick={onOpenDesktopMode}
                className="text-[11px] text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-700/60 transition-colors flex items-center gap-1"
              >
                <span>Desktop panel</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </button>
            )}
          </div>

          {/* User Profile Card */}
          <div className="bg-neutral-900/90 rounded-2xl p-4 border border-neutral-800 shadow-xl flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-lg font-black shadow-md">
                {avatarLetter}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-neutral-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-white truncate">
                  {displayName}
                </h2>
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              </div>
              <p className="text-xs text-blue-400 font-mono font-medium truncate">
                {displayUsername}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400 font-mono">
                <span>ID: {displayId}</span>
                <span>•</span>
                <span className="text-emerald-400 font-sans font-medium">Faol profil</span>
              </div>
            </div>
          </div>

          {/* Big Action: SCAN QR CODE BUTTON */}
          <button
            onClick={handleScanQr}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all p-4 rounded-2xl shadow-lg border border-blue-400/30 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <Camera className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-base font-black text-white flex items-center gap-2">
                  <span>QR Kodni Skanerlash</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                    Kamera
                  </span>
                </p>
                <p className="text-xs text-blue-100/80 mt-0.5">
                  Shartnomadagi QR kodni skanerlab darhol imzolang
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </button>

          {scanError && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300">
              {scanError}
            </div>
          )}

        </div>
      </div>

      {/* Main Body: Documents List */}
      <div className="max-w-md mx-auto w-full px-4 pt-5 flex-1 flex flex-col space-y-4">
        
        {/* Title and Filter Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-neutral-100">
                Mening Hujjatlarim
              </h3>
            </div>
            <button
              onClick={fetchDocuments}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Yangilash"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Hammasi ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('signed')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'signed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Imzolangan ({signedCount})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'pending'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Kutilmoqda ({pendingCount})
            </button>
          </div>
        </div>

        {/* Search input if documents > 2 */}
        {documents.length > 2 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hujjat nomi bo‘yicha qidirish..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        )}

        {/* Documents Cards List */}
        <div className="space-y-2.5 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-neutral-400">Hujjatlar yuklanmoqda...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-10 px-4 bg-neutral-900/60 border border-dashed border-neutral-800 rounded-2xl text-center space-y-3">
              <FileText className="w-8 h-8 text-neutral-600 mx-auto" />
              <div>
                <p className="text-xs font-semibold text-neutral-300">
                  {searchQuery ? 'Qidiruv bo‘yicha hujjat topilmadi' : 'Hozircha hech qanday hujjat mavjud emas'}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  QR kodni skanerlang yoki namunaviy hujjat bilan sinab ko‘ring.
                </p>
              </div>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSigned = doc.status === 'SIGNED';
              return (
                <div
                  key={doc.id}
                  className="bg-neutral-900 border border-neutral-800/90 rounded-2xl p-3.5 space-y-3 shadow-md hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSigned ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                      }`}>
                        {isSigned ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate max-w-[210px]">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                          Yuboruvchi: {doc.sender_name}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          {new Date(doc.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                      isSigned
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                        : 'bg-amber-950/90 text-amber-300 border border-amber-800/80'
                    }`}>
                      {isSigned ? 'Imzolangan' : 'Kutilmoqda'}
                    </span>
                  </div>

                  {/* Bottom Action for Document */}
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                    {isSigned ? (
                      <>
                        <a
                          href={doc.download_url}
                          download
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Imzolangan PDF yuklab olish</span>
                        </a>
                      </>
                    ) : (
                      <button
                        onClick={() => onOpenSigner(doc.token)}
                        className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span>✍️ Imzolash ekranini ochish</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Test Demo Document Option */}
        <div className="pt-4 border-t border-neutral-900 text-center">
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/signing/demo-token');
                const d = await res.json();
                if (d.token) onOpenSigner(d.token);
              } catch (e) {
                // ignore
              }
            }}
            className="text-xs text-neutral-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-neutral-900"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Namunaviy shartnomani sinovdan o‘tkazish</span>
          </button>
        </div>

      </div>

      {/* Manual Token / Link input Modal (Fallback for non-Telegram camera) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-bold text-white">QR / Havolani kiritish</h4>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Telegram bot yoki QR kod orqali olingan imzo tokenini yoki havolasini kiriting:
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="https://... yoki token"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-hidden focus:border-blue-500"
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-xl text-neutral-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={!manualTokenInput.trim()}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl text-white disabled:opacity-50"
                >
                  Ochish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
