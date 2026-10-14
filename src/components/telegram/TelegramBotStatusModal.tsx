import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Send, CheckCircle2, AlertCircle, Terminal, ExternalLink } from 'lucide-react';

interface TelegramBotStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramBotStatusModal: React.FC<TelegramBotStatusModalProps> = ({
  isOpen,
  onClose
}) => {
  const [status, setStatus] = useState<{
    configured: boolean;
    bot_username: string | null;
    app_url: string;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api.telegram.getStatus()
        .then(res => setStatus(res))
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Telegram Bot va Mini App integratsiyasi
              </h3>
              <p className="text-[11px] text-neutral-500">
                Konfiguratsiya va ulanish holati
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
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-neutral-400">Tekshirilmoqda...</div>
          ) : (
            <>
              {/* Status Badge Card */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                status?.configured 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}>
                {status?.configured ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-bold">
                    {status?.configured ? 'Telegram Bot Faol Ulangan' : 'Telegram Bot Tokeni Kutilmoqda'}
                  </p>
                  <p className="text-neutral-600 leading-relaxed">
                    {status?.message}
                  </p>
                  {status?.bot_username && (
                    <a
                      href={`https://t.me/${status.bot_username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline pt-1"
                    >
                      <span>@{status.bot_username} botini ochish</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* BotFather Instructions */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs text-neutral-700 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                  <Terminal className="w-4 h-4 text-neutral-600" />
                  <span>O‘z botingizni ulash uchun 3 bosqich:</span>
                </div>
                
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 pl-1 leading-relaxed">
                  <li>
                    Telegramda <b>@BotFather</b> ga o‘ting va <code className="bg-neutral-200 px-1 rounded font-mono text-[11px]">/newbot</code> buyrug‘ini yuboring.
                  </li>
                  <li>
                    Berilgan <b>Token</b>ni <code className="bg-neutral-200 px-1 rounded font-mono text-[11px]">TELEGRAM_BOT_TOKEN</code> muhit o‘zgaruvchisiga kiriting.
                  </li>
                  <li>
                    Bot username-ni <code className="bg-neutral-200 px-1 rounded font-mono text-[11px]">TELEGRAM_BOT_USERNAME</code> ga kiriting.
                  </li>
                </ol>
              </div>

              {/* WebApp Direct Mode Notice */}
              <div className="text-xs text-neutral-500 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <span className="font-semibold text-blue-900">💡 Qulaylik:</span> Token kiritilmagan holatda ham platforma 
                barcha imzo jarayonlarini to‘liq qo‘llab-quvvatlaydi. QR kodni brauzer yoki telefoningiz kamerasidan ochib, 
                gorizontal rejimda haqiqiy imzo chizishingiz va PDF yuklab olishingiz mumkin.
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Tushundim
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
