import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, LogOut, User as UserIcon, Send, Smartphone } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  onOpenSample: () => void;
  onOpenBotStatus: () => void;
  currentView: 'dashboard' | 'placement' | 'signing';
  onNavigateHome: () => void;
  onSwitchToMiniApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenUpload,
  onOpenSample,
  onOpenBotStatus,
  currentView,
  onNavigateHome,
  onSwitchToMiniApp
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold text-neutral-900 tracking-tight">DocuSign TG</span>
            </div>
          </button>
        </div>

        {/* Zone 2: Clean navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <button 
            onClick={onNavigateHome} 
            className={`transition-colors ${currentView === 'dashboard' ? 'text-blue-600 font-semibold' : 'hover:text-neutral-900'}`}
          >
            Hujjatlarim
          </button>
          <button 
            onClick={onOpenBotStatus} 
            className="hover:text-neutral-900 transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-blue-500" />
            Telegram Bot
          </button>
          <button 
            onClick={onOpenSample}
            className="hover:text-neutral-900 transition-colors"
          >
            Namuna shartnoma
          </button>
        </nav>

        {/* Zone 3: Primary actions & User profile */}
        <div className="flex items-center gap-3">
          {onSwitchToMiniApp && (
            <button
              onClick={onSwitchToMiniApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs"
              title="Telegram Mini App ko‘rinishiga o‘tish"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Mini App ko‘rinishi</span>
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenUpload}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                + Yangi PDF
              </button>

              <div className="flex items-center gap-2 pl-3 border-l border-neutral-200">
                <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 text-xs font-bold">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-neutral-900 truncate max-w-[130px]">{user.full_name}</p>
                  <p className="text-[11px] text-neutral-500 truncate max-w-[130px]">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  title="Chiqish"
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
              >
                Kirish
              </button>
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                Ro‘yxatdan o‘tish
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
