import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { SigningInfoResponse } from '../../types/client';
import { 
  CheckCircle2, 
  RotateCcw, 
  Download, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Smartphone, 
  Eye, 
  PenTool, 
  X,
  ArrowLeft
} from 'lucide-react';

interface TelegramSigningScreenProps {
  token: string;
  onNavigateHome?: () => void;
}

export const TelegramSigningScreen: React.FC<TelegramSigningScreenProps> = ({
  token,
  onNavigateHome
}) => {
  const [data, setData] = useState<SigningInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signedResult, setSignedResult] = useState<{
    downloadUrl: string;
    signedAt: string;
    signerName: string;
  } | null>(null);

  const [hasDrawn, setHasDrawn] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [isLandscapePromptVisible, setIsLandscapePromptVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Telegram WebApp if present
  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation?.();
      }
    } catch (e) {
      console.warn('Telegram WebApp initialization notice:', e);
    }
  }, []);

  // Check screen orientation to prompt landscape for mobile
  useEffect(() => {
    const checkOrientation = () => {
      if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
        setIsLandscapePromptVisible(true);
      } else {
        setIsLandscapePromptVisible(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Fetch signing request info
  const loadSigningInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.signing.getInfo(token);
      setData(res);
      if (res.request.status === 'SIGNED') {
        setIsSuccess(true);
        setSignedResult({
          downloadUrl: api.signing.getDownloadUrl(token),
          signedAt: res.request.signed_at || res.signature?.signed_at || '',
          signerName: res.signature?.signer_name || res.request.recipient_name
        });
      }
    } catch (err: any) {
      setError(err.message || 'Imzo so‘rovi ma\'lumotlarini yuklab bo‘lmadi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSigningInfo();
  }, [token]);

  // Canvas setup and high-DPI scaling
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Preserve existing drawn signature during orientation change or window resize
    let savedDataUrl: string | null = null;
    if (hasDrawn && canvas.width > 0 && canvas.height > 0) {
      try {
        savedDataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        // ignore
      }
    }

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e3a8a'; // classic dark ink navy blue
      ctx.lineWidth = 3.5;

      if (savedDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = savedDataUrl;
      }
    }
  };

  useEffect(() => {
    if (!isLoading && !isSuccess) {
      setupCanvas();
      window.addEventListener('resize', setupCanvas);
      return () => window.removeEventListener('resize', setupCanvas);
    }
  }, [isLoading, isSuccess]);

  // Touch and mouse drawing handlers
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    setHasDrawn(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);

    // Smooth quadratic curve interpolation
    const midX = (lastPointRef.current.x + coords.x) / 2;
    const midY = (lastPointRef.current.y + coords.y) / 2;
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  // Button 2: "Imzoni yangilash" (Reset Signature)
  const handleResetSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setError(null);
  };

  // Button 1: "Imzoni tasdiqlash" (Confirm Signature)
  const handleConfirmSignature = async () => {
    if (!hasDrawn) {
      setError('Iltimos, avval imzo qo‘ying.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert signature into transparent PNG base64
    const signatureBase64 = canvas.toDataURL('image/png');

    setIsSubmitting(true);
    setError(null);

    try {
      const tgInitData = (window as any).Telegram?.WebApp?.initData || '';

      const res = await api.signing.submit({
        token,
        signature_base64: signatureBase64,
        telegram_init_data: tgInitData,
        signer_name: data?.request.recipient_name
      });

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }

      setIsSuccess(true);
      setSignedResult({
        downloadUrl: res.download_url,
        signedAt: res.signed_at,
        signerName: res.signer_name
      });
    } catch (err: any) {
      setError(err.message || 'Imzoni tasdiqlashda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-300">Imzo so‘rovi yuklanmoqda...</p>
      </div>
    );
  }

  // Fatal Error state (Expired / Not found / Cancelled)
  if (error && !data) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mb-4 border border-red-800">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-neutral-100 mb-2">Imzo so‘rovida xatolik</h2>
        <p className="text-sm text-neutral-400 max-w-sm mb-6 leading-relaxed">{error}</p>
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Bosh sahifaga qaytish
          </button>
        )}
      </div>
    );
  }

  // SUCCESS STATE: Document signed successfully
  if (isSuccess && signedResult) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            Hujjat muvaffaqiyatli imzolandi
          </h2>
          <p className="text-xs text-neutral-400 mb-6">
            Elektron raqamli imzo hujjatning belgilangan joyiga muvaffaqiyatli joylashtirildi.
          </p>

          <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800/80 text-left text-xs space-y-2 mb-6 font-mono">
            <div className="flex justify-between border-b border-neutral-900 pb-2">
              <span className="text-neutral-500 font-sans">Hujjat nomi:</span>
              <span className="text-neutral-200 font-semibold truncate max-w-[200px]">
                {data?.document.title}
              </span>
            </div>
            <div className="flex justify-between border-b border-neutral-900 pb-2">
              <span className="text-neutral-500 font-sans">Imzolovchi:</span>
              <span className="text-neutral-200 font-semibold">{signedResult.signerName}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-900 pb-2">
              <span className="text-neutral-500 font-sans">Sana / Vaqt:</span>
              <span className="text-neutral-300 tabular-nums">
                {new Date(signedResult.signedAt || Date.now()).toLocaleString('uz-UZ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-sans">Holati:</span>
              <span className="text-emerald-400 font-bold">IMZOLANGAN (SIGNED)</span>
            </div>
          </div>

          {/* Download Signed Document Button */}
          <a
            href={signedResult.downloadUrl}
            download={`imzolangan_${data?.document.title || 'hujjat'}.pdf`}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <Download className="w-5 h-5" />
            <span>Imzolangan hujjatni yuklab olish</span>
          </a>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full py-2.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              DocuSign Telegram platformasiga o‘tish
            </button>
          )}

        </div>
      </div>
    );
  }

  // SIGNING SCREEN: Responsive mobile-first landscape canvas + controls
  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-white flex flex-col select-none">
      
      {/* Landscape Rotation Suggestion Prompt on portrait mobile */}
      {isLandscapePromptVisible && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs px-3 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 animate-pulse rotate-90" />
            <span>Kengroq imzo chizish uchun telefoningizni gorizontal o‘giring</span>
          </div>
          <button 
            onClick={() => setIsLandscapePromptVisible(false)}
            className="p-1 hover:bg-blue-700 rounded-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mini Header with Back Button */}
      <div className="h-12 bg-neutral-900 border-b border-neutral-800 px-3 sm:px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 truncate">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-300" />
              <span className="hidden sm:inline">Ortga</span>
            </button>
          )}
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <div className="truncate">
            <p className="text-xs font-bold text-neutral-100 truncate">
              {data?.document.title}
            </p>
            <p className="text-[10px] text-neutral-400 truncate">
              {data?.request.recipient_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/60">
            {hasDrawn ? '✓ Imzo chizildi' : 'Doska bo‘sh'}
          </span>
        </div>
      </div>

      {/* Main Container: 70% Signature Board + 30% 3 Action Buttons */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden p-2 sm:p-4 gap-2.5">
        
        {/* 70% Screen: White Signature Canvas Board */}
        <div className="h-[68vh] sm:h-[70vh] flex flex-col relative bg-neutral-900 rounded-2xl border-2 border-neutral-800 p-2 sm:p-3 overflow-hidden shadow-2xl">
          
          <div className="flex items-center justify-between px-2 pb-1.5 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
              <PenTool className="w-3.5 h-3.5 text-blue-400" />
              <span>Qo‘l qo‘yish uchun doska (70%)</span>
            </div>
            <span className="text-[11px] text-neutral-400">
              Barmog‘ingiz bilan chizing
            </span>
          </div>

          {/* White Drawing Canvas Board */}
          <div className="flex-1 relative bg-white rounded-xl shadow-inner border border-neutral-300 overflow-hidden touch-none flex items-center justify-center">
            
            {/* Guide line and watermark inside canvas */}
            <div className="absolute inset-x-8 bottom-10 border-b-2 border-dashed border-neutral-300 pointer-events-none flex justify-between text-[11px] text-neutral-400 select-none pb-1 font-mono">
              <span>✍️ Imzo chizig‘i</span>
              <span>Online Imzo Bot</span>
            </div>

            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-red-950/90 border border-red-800 rounded-xl text-xs text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 30% Area: EXACTLY 3 BUTTONS PER USER SPECIFICATION */}
        <div className="shrink-0 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2.5 sm:p-3 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            
            {/* 1-button: "Hujjatni ko'rish" */}
            <button
              onClick={() => setShowDocPreview(true)}
              type="button"
              className="py-3 px-3 bg-neutral-800 hover:bg-neutral-700 active:scale-98 text-neutral-200 hover:text-white text-xs font-bold rounded-xl border border-neutral-700/80 transition-all flex items-center justify-center gap-2 shadow-sm order-2 sm:order-1"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>1. Hujjatni ko‘rish</span>
            </button>

            {/* 2-button: "Imzoni tasdiqlash" (Primary Main Action) */}
            <button
              onClick={handleConfirmSignature}
              disabled={isSubmitting}
              type="button"
              className="py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white text-sm font-extrabold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Tasdiqlanmoqda...</span>
                </div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>2. Imzoni tasdiqlash</span>
                </>
              )}
            </button>

            {/* 3-button: "Qayta imzo qo'yish" */}
            <button
              onClick={handleResetSignature}
              disabled={isSubmitting}
              type="button"
              className="py-3 px-3 bg-neutral-800 hover:bg-neutral-700 active:scale-98 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-neutral-700/80 transition-all flex items-center justify-center gap-2 shadow-sm order-3"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>3. Qayta imzo qo‘yish</span>
            </button>

          </div>
        </div>

      </div>

      {/* Document Quick Preview Modal */}
      {showDocPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-white truncate max-w-md">
                  {data?.document.title}
                </h4>
              </div>
              <button
                onClick={() => setShowDocPreview(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-neutral-950 flex justify-center">
              <iframe
                src={api.signing.getPreviewPdfUrl(token)}
                className="w-full h-[65vh] border-0 rounded-lg bg-white"
                title="Hujjat ko‘rinishi"
              />
            </div>

            <div className="p-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowDocPreview(false)}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                Yopish va imzo qo‘yish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
