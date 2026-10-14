import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentItem } from '../../types/client';
import { api } from '../../services/api';
import { 
  ArrowLeft, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Move, 
  Check, 
  AlertCircle, 
  User, 
  AtSign, 
  Calendar,
  Maximize2
} from 'lucide-react';

interface SignaturePlacementEditorProps {
  document: DocumentItem;
  onBack: () => void;
  onSuccess: (signingRequest: any, qr: any) => void;
}

export const SignaturePlacementEditor: React.FC<SignaturePlacementEditorProps> = ({
  document,
  onBack,
  onSuccess
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = Math.max(1, document.page_count || 1);

  // Signature box placement coordinates in percentages (0 to 100)
  const [box, setBox] = useState({
    x: 52, // 52% from left
    y: 65, // 65% from top
    w: 36, // 36% width
    h: 12  // 12% height
  });

  // Recipient form inputs
  const [recipientName, setRecipientName] = useState('Jamshid Aliyev');
  const [recipientTelegram, setRecipientTelegram] = useState('@jamshid_dev');
  const [expiryDays, setExpiryDays] = useState(7);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, boxX: 0, boxY: 0 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  // PDF.js rendering attempt
  useEffect(() => {
    let isCancelled = false;

    const renderPdfPage = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib || await import('pdfjs-dist');
        if (!pdfjsLib || isCancelled) return;

        // Use local worker bundled in node_modules rather than fragile external CDN
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-worker/pdf.worker.min.mjs';
        }

        const pdfUrl = api.documents.getPdfUrl(document.id);
        const token = localStorage.getItem('docsign_token');
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
          // Prevent font loading worker crashes
          disableFontFace: false
        });

        const pdf = await loadingTask.promise.catch(() => null);
        if (!pdf || isCancelled) return;

        const page = await pdf.getPage(currentPage).catch(() => null);
        if (!page || isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise.catch(() => null);
        }
      } catch (e) {
        console.warn('PDF.js preview fallback applied:', e);
      }
    };

    renderPdfPage();
    return () => { isCancelled = true; };
  }, [document.id, currentPage]);

  // Dragging logic
  const handleMouseDownBox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: box.x,
      boxY: box.y
    });
  };

  const handleMouseDownResize = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setActiveHandle(handle);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: box.x,
      boxY: box.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (isDragging) {
      const deltaXPct = ((e.clientX - dragStart.mouseX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStart.mouseY) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100 - box.w, dragStart.boxX + deltaXPct));
      const newY = Math.max(0, Math.min(100 - box.h, dragStart.boxY + deltaYPct));

      setBox(prev => ({ ...prev, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 }));
    } else if (activeHandle) {
      const deltaXPct = ((e.clientX - dragStart.mouseX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStart.mouseY) / rect.height) * 100;

      if (activeHandle === 'se') {
        const newW = Math.max(10, Math.min(100 - box.x, box.w + deltaXPct));
        const newH = Math.max(5, Math.min(100 - box.y, box.h + deltaYPct));
        setBox(prev => ({ ...prev, w: Math.round(newW * 10) / 10, h: Math.round(newH * 10) / 10 }));
        setDragStart(prev => ({ ...prev, mouseX: e.clientX, mouseY: e.clientY }));
      }
    }
  }, [isDragging, activeHandle, dragStart, box]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging || activeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, activeHandle, handleMouseMove, handleMouseUp]);

  // Container click to position box
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPct = ((e.clientY - rect.top) / rect.height) * 100;

    const newX = Math.max(0, Math.min(100 - box.w, clickXPct - box.w / 2));
    const newY = Math.max(0, Math.min(100 - box.h, clickYPct - box.h / 2));

    setBox(prev => ({
      ...prev,
      x: Math.round(newX * 10) / 10,
      y: Math.round(newY * 10) / 10
    }));
  };

  // Submit and create request
  const handleConfirmAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setError('Iltimos, qabul qiluvchining ismini kiriting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.signing.createRequest({
        document_id: document.id,
        recipient_name: recipientName.trim(),
        recipient_telegram_id: recipientTelegram.trim() || undefined,
        page_number: currentPage,
        x_pct: box.x,
        y_pct: box.y,
        width_pct: box.w,
        height_pct: box.h,
        expires_in_days: expiryDays
      });

      onSuccess(res.signing_request, res.qr);
    } catch (err: any) {
      setError(err.message || 'So‘rov yaratishda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-100 flex flex-col">
      
      {/* Top Banner with Instruction */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900 truncate max-w-sm">
                  {document.original_filename}
                </h2>
                <span className="text-[11px] font-mono text-neutral-500">
                  ({totalPages} sahifa)
                </span>
              </div>
              <p className="text-xs text-blue-600 font-medium">
                👉 Imzo qo‘yiladigan joyni belgilang (sariq ramkani kerakli joyga suring)
              </p>
            </div>
          </div>

          {/* Page navigation controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:hover:text-neutral-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono font-medium text-neutral-700 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:hover:text-neutral-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main split work area */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* PDF Document Canvas Viewport (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div 
            ref={containerRef}
            onClick={handleContainerClick}
            className="relative w-full max-w-[650px] bg-white rounded-lg shadow-md border border-neutral-300 overflow-hidden cursor-crosshair select-none"
            style={{ minHeight: '840px', aspectRatio: '1 / 1.414' }}
          >
            {/* Real PDF Canvas (rendered via pdfjs if available) */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Default Paper Visual Representation (guaranteed visible contract layout) */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none opacity-85">
              <div>
                <div className="h-1 bg-blue-600 w-full mb-6"></div>
                <div className="text-center mb-6">
                  <h3 className="text-sm font-bold tracking-tight text-neutral-800 uppercase">
                    XIZMAT KO‘RSATISH SHARTNOMASI № 2026/SP-01
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">
                    Toshkent shahri · "05" Oktyabr 2026 yil
                  </p>
                </div>

                <div className="space-y-3 text-[11px] leading-relaxed text-neutral-700">
                  <p className="font-semibold text-neutral-900">1. SHARTNOMA PREDMETI</p>
                  <p className="text-neutral-600">
                    1.1. Ijrochi Buyurtmachining topshirig‘iga binoan axborot tizimlarini ishlab chiqish va texnik qo‘llab-quvvatlash bo‘yicha xizmatlarni o‘z vaqtida va sifatli bajarish majburiyatini oladi.
                  </p>
                  <p className="font-semibold text-neutral-900 pt-2">2. TOMONLARNING HUQUQ VA MAJBURIYATLARI</p>
                  <p className="text-neutral-600">
                    2.1. Tomonlar ushbu Shartnoma doirasida olingan barcha ma'lumotlarning maxfiyligini saqlash majburiyatini o‘z zimmalariga oladilar.
                  </p>
                  <p className="text-neutral-600">
                    2.2. Ushbu hujjat O‘zbekiston Respublikasining "Elektron raqamli imzo to‘g‘risida"gi Qonuni talablariga muvofiq elektron tarzda tasdiqlanadi.
                  </p>
                </div>
              </div>

              {/* Bottom signers block on page */}
              <div className="border-t border-neutral-300 pt-4 mt-8 grid grid-cols-2 gap-6 text-[10px] text-neutral-700">
                <div>
                  <p className="font-bold text-neutral-900">BUYURTMACHI:</p>
                  <p className="text-neutral-600">"Smart Solutions" MCHJ</p>
                  <p className="text-neutral-500 mt-2">Imzo: _____________________</p>
                </div>
                <div>
                  <p className="font-bold text-neutral-900">IJROCHI (Imzolovchi):</p>
                  <p className="text-neutral-600">{recipientName || 'Qabul qiluvchi'}</p>
                  <p className="text-neutral-500 mt-2">Imzo joyi (quyida):</p>
                </div>
              </div>
            </div>

            {/* Draggable & Resizable Signature Box */}
            <div
              onMouseDown={handleMouseDownBox}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`
              }}
              className={`absolute border-2 border-amber-500 bg-amber-400/20 rounded-md cursor-grab active:cursor-grabbing flex flex-col items-center justify-center p-1 transition-shadow shadow-xs hover:shadow-md ${
                isDragging ? 'shadow-lg border-blue-600 bg-blue-500/25 ring-2 ring-blue-500/30' : ''
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 pointer-events-none select-none">
                <span>✍️</span>
                <span>[ Imzo maydoni ]</span>
              </div>
              <div className="text-[9px] font-mono text-amber-800/80 pointer-events-none">
                Sahifa {currentPage} · ({Math.round(box.x)}%, {Math.round(box.y)}%)
              </div>

              {/* Resize Handle (Bottom-Right) */}
              <div
                onMouseDown={(e) => handleMouseDownResize(e, 'se')}
                className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-amber-600 rounded-full border-2 border-white cursor-se-resize shadow-xs hover:scale-125 transition-transform"
                title="Hajmini o‘zgartirish"
              />
            </div>

          </div>

          <p className="text-xs text-neutral-500 mt-2 text-center">
            Sariq ramkani hujjatdagi imzo chizig‘i ustiga suring yoki sahifaning istalgan joyiga bosing
          </p>
        </div>

        {/* Sidebar Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-5">
            <h3 className="text-sm font-bold text-neutral-900 mb-1">
              Imzolovchi ma'lumotlari
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Ushbu shaxs QR kodni skanerlab hujjatni imzolaydi
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAndSend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Qabul qiluvchi ismi *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Masalan: Jamshid Aliyev"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Telegram foydalanuvchi nomi yoki ID
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={recipientTelegram}
                    onChange={(e) => setRecipientTelegram(e.target.value)}
                    placeholder="@foydalanuvchi"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  QR kod orqali istalgan Telegram foydalanuvchisi kirishi mumkin
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Amal qilish muddati (kun)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 7)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Exact placement specs card */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tanlangan sahifa:</span>
                  <span className="font-semibold text-neutral-900">{currentPage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">X koordinata:</span>
                  <span>{box.x}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Y koordinata:</span>
                  <span>{box.y}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">O‘lchamlari:</span>
                  <span>{box.w}% × {box.h}%</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>QR kod yaratilmoqda...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>QR kod yaratish va imzolashga yuborish</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick presets */}
          <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-4">
            <h4 className="text-xs font-semibold text-neutral-700 mb-2">
              Tezkor imzo joylashuvi shablonlari:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBox({ x: 54, y: 65, w: 35, h: 12 })}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left font-medium text-neutral-700 transition-colors"
              >
                O‘ng pastki (Ijrochi)
              </button>
              <button
                type="button"
                onClick={() => setBox({ x: 8, y: 65, w: 35, h: 12 })}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left font-medium text-neutral-700 transition-colors"
              >
                Chap pastki (Buyurtmachi)
              </button>
              <button
                type="button"
                onClick={() => setBox({ x: 30, y: 80, w: 40, h: 12 })}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left font-medium text-neutral-700 transition-colors"
              >
                Markaziy pastki
              </button>
              <button
                type="button"
                onClick={() => setBox({ x: 50, y: 40, w: 35, h: 12 })}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-left font-medium text-neutral-700 transition-colors"
              >
                O‘rta bo‘lim
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
