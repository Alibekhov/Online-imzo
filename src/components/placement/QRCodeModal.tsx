import React, { useState } from 'react';
import { X, Copy, Check, Download, ExternalLink, Send, ShieldCheck, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  signingRequest: any;
  qrData: {
    dataUrl: string;
    telegramDeepLink: string;
    webDirectLink: string;
    targetUrl: string;
  };
  onOpenSignerScreen: (token: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  signingRequest,
  qrData,
  onOpenSignerScreen
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !signingRequest || !qrData) return null;

  const handleCopyLink = () => {
    const link = qrData.targetUrl || qrData.webDirectLink;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = qrData.dataUrl;
    a.download = `qr_imzo_${signingRequest.token.substring(0, 8)}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                QR kod tayyor
              </h3>
              <p className="text-[11px] text-neutral-500">
                Imzo so‘rovi: {signingRequest.recipient_name}
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

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          
          <div className="p-4 bg-white rounded-2xl border-2 border-neutral-200 shadow-xs mb-4">
            <img 
              src={qrData.dataUrl} 
              alt="Imzo uchun QR kod" 
              className="w-56 h-56 object-contain"
            />
          </div>

          <h4 className="text-base font-bold text-neutral-900">
            QR kodni skaner qiling
          </h4>
          <p className="text-xs text-neutral-600 mt-1 max-w-xs leading-relaxed">
            Qabul qiluvchi telefon kamerasidan yoki Telegram orqali QR kodni skanerlab, 
            ekranda imzo chizadi va tasdiqlaydi.
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Xavfsiz bir martalik 24-baytli token</span>
          </div>

          {/* Action buttons */}
          <div className="w-full mt-6 space-y-2">
            
            {/* Direct signer screen test in browser */}
            <button
              onClick={() => onOpenSignerScreen(signingRequest.token)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Imzolash ekranini brauzerda ochish (Test)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium rounded-lg border border-neutral-200 transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Havolani nusxalash</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadQr}
                className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium rounded-lg border border-neutral-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>QR kodni yuklash</span>
              </button>
            </div>

            {/* Telegram deep link notice */}
            {qrData.telegramDeepLink && (
              <a
                href={qrData.telegramDeepLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 pt-2 transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>Telegram Bot havolasini ochish</span>
              </a>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
