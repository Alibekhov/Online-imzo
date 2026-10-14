import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { DocumentItem } from '../../types/client';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (doc: DocumentItem) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Faqat PDF formatdagi fayllar qabul qilinadi.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Iltimos, avval PDF faylni tanlang.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const res = await api.documents.upload(selectedFile);
      onUploaded(res.document);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Faylni yuklashda xatolik yuz berdi');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSample = async () => {
    setIsSampleLoading(true);
    setError(null);

    try {
      const res = await api.documents.createSample();
      onUploaded(res.document);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Namuna hujjat yaratishda xatolik yuz berdi');
    } finally {
      setIsSampleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Hujjatni yuklash (PDF)
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Imzolatmoqchi bo‘lgan shartnoma yoki hujjatingizni tanlang
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Box */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              selectedFile 
                ? 'border-blue-500 bg-blue-50/30' 
                : 'border-neutral-300 hover:border-blue-400 bg-neutral-50/50'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf,application/pdf" 
              onChange={handleFileChange}
              className="hidden" 
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-neutral-900 truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-neutral-500 mt-1 font-mono">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  Boshqa fayl tanlash uchun bosing
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-neutral-800">
                  PDF faylni shu yerga tortib olib keling yoki tanlang
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Maksimal hajm: 25 MB
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-5 space-y-3">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>Yuklanmoqda...</>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Hujjatni yuklash va imzo joyini belgilash</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-neutral-200 w-full"></div>
              <span className="bg-white px-3 text-xs text-neutral-400 uppercase font-medium">yoki</span>
            </div>

            <button
              type="button"
              onClick={handleGenerateSample}
              disabled={isSampleLoading}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{isSampleLoading ? 'Yaratilmoqda...' : 'Tayyor namunaviy shartnoma bilan sinash'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
