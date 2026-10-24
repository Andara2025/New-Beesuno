import React from 'react';
import { X, History, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { AudioFileItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  renderedFiles: AudioFileItem[];
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  renderedFiles,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-[#14151b] border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-white" />
            <h3 className="text-base font-semibold text-white">Riwayat Render Studio</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderedFiles.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono">
            Belum ada berkas audio yang selesai dirender di sesi ini.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {renderedFiles.map((file, idx) => (
              <div
                key={file.id || idx}
                className="bg-[#181920] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold text-white truncate">{file.name}</div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>C2PA Purged • Master -14 LUFS Clean</span>
                  </div>
                </div>

                {file.resultUrl && (
                  <a
                    href={file.resultUrl}
                    download={file.name}
                    className="bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 shrink-0 transition shadow-sm active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          {renderedFiles.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-zinc-400 hover:text-rose-400 text-xs flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Riwayat</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
