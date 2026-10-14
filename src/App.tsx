import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './components/dashboard/Dashboard';
import { LoginRegisterModal } from './components/auth/LoginRegisterModal';
import { UploadModal } from './components/upload/UploadModal';
import { SignaturePlacementEditor } from './components/placement/SignaturePlacementEditor';
import { QRCodeModal } from './components/placement/QRCodeModal';
import { TelegramSigningScreen } from './components/signing/TelegramSigningScreen';
import { AuditTrailModal } from './components/audit/AuditTrailModal';
import { TelegramBotStatusModal } from './components/telegram/TelegramBotStatusModal';
import { DocumentItem } from './types/client';
import { TelegramMiniAppHome } from './components/telegram/TelegramMiniAppHome';
import { FileText, QrCode, Smartphone, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Navigation and active view
  const [currentView, setCurrentView] = useState<'dashboard' | 'placement' | 'signing'>('dashboard');
  const [signingToken, setSigningToken] = useState<string | null>(null);

  // Selected document for placement
  const [placementDoc, setPlacementDoc] = useState<DocumentItem | null>(null);

  // Active Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBotStatusOpen, setIsBotStatusOpen] = useState(false);
  const [auditDocId, setAuditDocId] = useState<string | null>(null);

  // QR Modal data
  const [activeQrRequest, setActiveQrRequest] = useState<any>(null);
  const [activeQrData, setActiveQrData] = useState<any>(null);

  // Detect if app is currently running inside Telegram WebApp or requested miniapp mode
  const isInsideTelegram = Boolean(
    (typeof window !== 'undefined') && (
      (window as any).Telegram?.WebApp?.initData || 
      window.location.hash.includes('tgWebAppData') ||
      (window as any).TelegramWebviewProxy ||
      window.location.search.includes('tgWebApp') ||
      window.location.search.includes('mode=miniapp')
    )
  );

  const [appMode, setAppMode] = useState<'desktop' | 'miniapp'>(isInsideTelegram ? 'miniapp' : 'desktop');
  const tgUser = (typeof window !== 'undefined') ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;

  // Check URL path and Telegram WebApp start parameters on mount & popstate
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check various ways Telegram or URLs pass start tokens
      const tgStartParam = 
        (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param ||
        searchParams.get('tgWebAppStartParam') ||
        searchParams.get('startapp') ||
        searchParams.get('token');

      if (tgStartParam) {
        const cleanToken = tgStartParam.replace(/^sign_/, '').trim();
        if (cleanToken) {
          setSigningToken(cleanToken);
          setCurrentView('signing');
          return;
        }
      }

      if (path.startsWith('/sign/')) {
        const token = path.replace('/sign/', '').trim();
        if (token) {
          setSigningToken(token);
          setCurrentView('signing');
          return;
        }
      }

      // Default back to dashboard
      if (currentView === 'signing') {
        setCurrentView('dashboard');
        setSigningToken(null);
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  const handleOpenSigner = (token: string) => {
    setSigningToken(token);
    setCurrentView('signing');
    window.history.pushState({}, '', `/sign/${token}`);
  };

  const handleOpenDemoSigner = async () => {
    try {
      const res = await fetch('/api/signing/demo-token');
      const data = await res.json();
      if (data.token) {
        handleOpenSigner(data.token);
      }
    } catch (e) {
      console.error('Demo token fetch error:', e);
    }
  };

  const handleNavigateHome = () => {
    setCurrentView('dashboard');
    setSigningToken(null);
    setPlacementDoc(null);
    window.history.pushState({}, '', '/');
  };

  // If user is on the signing view (/sign/:token or active signingToken), render 70% Signature Board with 3 buttons
  if (currentView === 'signing' && signingToken) {
    return (
      <TelegramSigningScreen
        token={signingToken}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  // If app is opened inside Telegram or user switched to Mini App mode:
  // Render Screen 1: Profile + QR Scan + Documents List!
  if (appMode === 'miniapp') {
    return (
      <TelegramMiniAppHome
        onOpenSigner={handleOpenSigner}
        onOpenDesktopMode={() => setAppMode('desktop')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenUpload={() => {
          if (!isAuthenticated) setIsAuthOpen(true);
          else setIsUploadOpen(true);
        }}
        onOpenSample={() => {
          if (!isAuthenticated) setIsAuthOpen(true);
          else setIsUploadOpen(true);
        }}
        onOpenBotStatus={() => setIsBotStatusOpen(true)}
        currentView={currentView}
        onNavigateHome={handleNavigateHome}
        onSwitchToMiniApp={() => setAppMode('miniapp')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isAuthenticated ? (
          currentView === 'placement' && placementDoc ? (
            <SignaturePlacementEditor
              document={placementDoc}
              onBack={() => {
                setPlacementDoc(null);
                setCurrentView('dashboard');
              }}
              onSuccess={(signingReq, qr) => {
                setPlacementDoc(null);
                setCurrentView('dashboard');
                setActiveQrRequest(signingReq);
                setActiveQrData(qr);
              }}
            />
          ) : (
            <Dashboard
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenSample={() => setIsUploadOpen(true)}
              onSelectDocumentForPlacement={(doc) => {
                setPlacementDoc(doc);
                setCurrentView('placement');
              }}
              onShowQr={(req, qr) => {
                setActiveQrRequest(req);
                setActiveQrData(qr);
              }}
              onShowAudit={(docId) => setAuditDocId(docId)}
              onOpenSignerScreen={handleOpenSigner}
            />
          )
        ) : isInsideTelegram ? (
          /* Unauthenticated View: Telegram Mini App Hub */
          <div className="max-w-md mx-auto px-4 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">
                DocuSign Telegram Mini App
              </h2>
              <p className="text-xs text-neutral-500 mt-1 mb-6">
                {tgUser ? `Assalomu alaykum, ${tgUser.first_name}!` : 'Xush kelibsiz!'}
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleOpenDemoSigner}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <span>✍️ Namuna shartnomani imzolash (Sinov)</span>
                </button>

                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl border border-neutral-300 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📄 Boshqaruv paneli / Tizimga kirish</span>
                </button>
              </div>

              <div className="mt-8 p-4 bg-neutral-100/80 rounded-xl text-xs text-neutral-600 text-left space-y-2 border border-neutral-200">
                <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Qanday ishlaydi?</span>
                </p>
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  1. Yuboruvchi PDF yuklab, imzo o‘rnini tanlaydi va QR kod yaratadi.<br/>
                  2. Qabul qiluvchi QR kodni skanerlab yoki bot orqali ekranda imzo chizadi.<br/>
                  3. Imzo PDF ga joylashtirilib, rasmiy imzolangan nusxa yuklab olinadi.
                </p>
              </div>
            </div>
          ) : (
          <div className="max-w-5xl mx-auto px-4 py-16 text-center">
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Telegram Mini App bilan integratsiyalangan e-imzo platformasi</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 max-w-3xl mx-auto leading-tight">
              Hujjatlarni istalgan joydan <span className="text-blue-600">Telegram orqali</span> tezkor va xavfsiz imzolang
            </h1>

            <p className="mt-4 text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              PDF yuklang, imzo o‘rnini belgilang va QR kod yarating. Qabul qiluvchi QR kodni skanerlab, 
              Telegram Mini App orqali barmog‘i bilan imzolaydi. Imzo avtomatik ravishda PDF ga joylanadi.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>Tizimga kirish yoki Ro‘yxatdan o‘tish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsBotStatusOpen(true)}
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-neutral-100 text-neutral-800 text-sm font-semibold rounded-xl border border-neutral-300 transition-colors"
              >
                Telegram Bot integratsiyasi
              </button>
            </div>

            {/* Visual Workflow Steps */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  1. PDF yuklang va joyni belgilang
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Shartnoma yoki hujjatingizni yuklab, sahifada qabul qiluvchi imzo qo‘yishi kerak bo‘lgan koordinatani tanlang.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  2. QR kodni ulashing
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Tizim 24-baytli xavfsiz bir martalik token va Telegram deep link bilan QR kod yaratadi.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  3. Telegramda imzolang
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Imzolovchi ekranda barmog‘i bilan imzo chizadi. Server imzoni PDF ning aynan belgilangan joyiga joylashtiradi.
                </p>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © 2026 DocuSign Telegram Platform. O‘zbekiston Respublikasi "Elektron raqamli imzo to‘g‘risida"gi qonuniga muvofiq.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
            <span>Xavfsiz PDF generatsiya</span>
            <span>·</span>
            <span>HMAC-SHA256 Token</span>
            <span>·</span>
            <span>Audit jurnali</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <LoginRegisterModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={(doc) => {
          setPlacementDoc(doc);
          setCurrentView('placement');
        }}
      />

      <QRCodeModal
        isOpen={Boolean(activeQrRequest && activeQrData)}
        onClose={() => {
          setActiveQrRequest(null);
          setActiveQrData(null);
        }}
        signingRequest={activeQrRequest}
        qrData={activeQrData}
        onOpenSignerScreen={handleOpenSigner}
      />

      <AuditTrailModal
        documentId={auditDocId || ''}
        isOpen={Boolean(auditDocId)}
        onClose={() => setAuditDocId(null)}
      />

      <TelegramBotStatusModal
        isOpen={isBotStatusOpen}
        onClose={() => setIsBotStatusOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
