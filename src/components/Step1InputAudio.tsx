import React, { useRef } from 'react';
import { UploadCloud, Plus, Trash2, ShieldAlert, ArrowRight, Music2, FileAudio, Link2 } from 'lucide-react';
import { AudioFileItem } from '../types';
import { SunoDownloaderCard } from './SunoDownloaderCard';

interface Step1InputAudioProps {
  files: AudioFileItem[];
  onAddFiles: (fileList: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
  onNext: () => void;
}

export const Step1InputAudio: React.FC<Step1InputAudioProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  onNext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08] font-semibold">
            LANGKAH 1
          </span>
          <span className="text-sm font-semibold text-white">Unggah & Sanitasi File Audio</span>
        </div>
        <span className="text-xs text-zinc-400 hidden sm:inline">Pindai & lucuti manifest C2PA secara otomatis</span>
      </div>

      {/* FULL-WIDTH DROP AREA & CENTERED ADD FILE BUTTON (macOS Slick Interface) */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="w-full border-2 border-dashed border-white/[0.15] hover:border-white/40 rounded-2xl py-12 px-6 sm:py-16 sm:px-10 bg-[#14151b]/80 hover:bg-[#181920] backdrop-blur-md transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/mp3,audio/wav,audio/flac,audio/aac,audio/m4a,audio/mpeg,audio/ogg,audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles(e.target.files);
            }
          }}
        />

        {/* Centered Upload Icon */}
        <div className="w-16 h-16 rounded-2xl bg-white/[0.06] group-hover:bg-white/[0.12] text-zinc-200 group-hover:text-white flex items-center justify-center mb-5 transition-all border border-white/[0.08] shadow-sm group-hover:scale-105">
          <UploadCloud className="w-8 h-8 stroke-[1.75]" />
        </div>

        {/* Centered Heading & Subtitle */}
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Tarik & Lepas File Audio ke Sini
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mb-6 leading-relaxed">
          Mendukung berkas MP3, WAV, FLAC, M4A, OGG. Pemrosesan aman dan instan secara offline langsung di memori browser Anda.
        </p>

        {/* FULL-WIDTH CENTERED "TAMBAH FILE" BUTTON */}
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          <button
            type="button"
            className="w-full py-3 px-6 rounded-xl bg-[#2c2e38] hover:bg-[#363845] text-white text-sm font-medium flex items-center justify-center gap-2.5 shadow-sm border border-white/20 active:scale-[0.99] transition"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah File Audio dari Komputer</span>
          </button>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono mt-3">
          atau klik di seluruh area kotak ini untuk memilih berkas
        </div>
      </div>

      {/* File List if files exist */}
      {files.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-semibold text-white flex items-center gap-2">
              <Music2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Daftar Antrean Master ({files.length} Lagu)</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              C2PA Scanner Active
            </span>
          </div>

          <div className="space-y-2">
            {files.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#14151b] border border-white/[0.08] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/[0.15] transition shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 text-white flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-white truncate">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                      <span>{formatFileSize(item.size)}</span>
                      <span>•</span>
                      <span>{formatTime(item.duration)}</span>
                      <span>•</span>
                      <span>{item.sampleRate || 44100} Hz</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <div className="flex items-center gap-1.5 bg-white/[0.06] text-zinc-200 border border-white/[0.08] px-2.5 py-1 rounded-md text-[11px] font-mono font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                    <span>C2PA Purge Ready (14.0 KB)</span>
                  </div>

                  <button
                    onClick={() => onRemoveFile(item.id)}
                    className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                    title="Hapus file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation to Step 2 */}
          <div className="flex justify-end pt-4 border-t border-white/[0.08]">
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition shadow-sm bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 active:scale-95"
            >
              <span>Lanjut ke Format Output</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Suno Song Downloader & Direct Decryptor (Secondary Utility Below Drop Area) */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 px-1">
          <Link2 className="w-3.5 h-3.5" />
          <span>Atau Impor Audio Langsung dari Tautan Suno.com</span>
        </div>
        <SunoDownloaderCard onImportToRemaster={(file) => onAddFiles([file])} />
      </div>
    </div>
  );
};
