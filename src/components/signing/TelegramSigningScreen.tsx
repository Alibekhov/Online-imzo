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
  X
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

      {/* Mini Header */}
      <div className="h-11 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="text-xs font-semibold text-neutral-200 truncate">
            {data?.document.title}
          </span>
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            · {data?.document.sender_name} tomonidan
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDocPreview(true)}
            className="px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md border border-neutral-700 flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3 h-3 text-blue-400" />
            <span>Hujjatni ko‘rish</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: ~70% Signature Canvas + ~30% Control Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* ~70% Screen: Large Signature Canvas Area */}
        <div className="flex-1 md:w-[72%] relative bg-neutral-900 flex flex-col p-2 sm:p-4">
          
          <div className="flex items-center justify-between px-2 pb-1.5 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 font-medium text-neutral-300">
              <PenTool className="w-3.5 h-3.5 text-blue-400" />
              <span>Imzo qo‘ying (barmog‘ingiz yoki stilus bilan chizing)</span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">
              {hasDrawn ? '✓ Imzo chizildi' : 'Chizilmagan'}
            </span>
          </div>

          {/* White Drawing Canvas Container */}
          <div className="flex-1 relative bg-white rounded-xl shadow-inner border-2 border-neutral-700 overflow-hidden touch-none flex items-center justify-center">
            
            {/* Guide line inside canvas */}
            <div className="absolute inset-x-8 bottom-12 border-b border-dashed border-neutral-300 pointer-events-none flex justify-between text-[10px] text-neutral-400 select-none pb-1">
              <span>✍️ Imzo chizig‘i</span>
              <span>DocuSign TG Security</span>
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

          <p className="text-[10px] text-neutral-500 mt-1 px-2 text-center md:text-left">
            Imzo shaffof fonda saqlanib, hujjatning sahifasidagi belgilangan koordinatalariga joylashtiriladi.
          </p>
        </div>

        {/* ~30% Screen: Control Panel */}
        <div className="md:w-[28%] bg-neutral-950 border-t md:border-t-0 md:border-l border-neutral-800 p-3 sm:p-5 flex flex-col justify-between shrink-0">
          
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Imzolovchi
              </p>
              <p className="text-sm font-bold text-white mt-0.5 truncate">
                {data?.request.recipient_name}
              </p>
              {data?.request.recipient_telegram_id && (
                <p className="text-xs text-blue-400 font-mono">
                  {data?.request.recipient_telegram_id}
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-neutral-400">
                <span>Sahifa:</span>
                <span className="text-neutral-200">{data?.placement?.page_number || 1}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Joylashuv:</span>
                <span className="text-neutral-200">{data?.placement?.x_pct}% / {data?.placement?.y_pct}%</span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Action Buttons: Button 1 & Button 2 per specification */}
          <div className="space-y-2.5 pt-3">
            
            {/* Button 1: "Imzoni tasdiqlash" */}
            <button
              onClick={handleConfirmSignature}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Hujjat tasdiqlanmoqda...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>Imzoni tasdiqlash</span>
                </>
              )}
            </button>

            {/* Button 2: "Imzoni yangilash" */}
            <button
              onClick={handleResetSignature}
              disabled={isSubmitting}
              type="button"
              className="w-full py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border border-neutral-700 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-neutral-400" />
              <span>Imzoni yangilash</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Xavfsiz elektron tasdiqlash</span>
            </div>

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
