import React, { useRef } from 'react';
import { ArrowLeft, Zap, ShieldCheck, Waves, Image as ImageIcon, CheckCircle2, Download, Package, Sparkles, Hash, Music2 } from 'lucide-react';
import { AudioFileItem, AudioFormat, MasteringPreset, MetadataSettings } from '../types';
import { resolveUniqueQueueTitles, cleanTitleFromFileName } from '../utils/c2paPurge';

interface Step4CopyrightProps {
  files: AudioFileItem[];
  format: AudioFormat;
  preset: MasteringPreset;
  metadata: MetadataSettings;
  setMetadata: (metadata: MetadataSettings) => void;
  onUpdateFileTitle?: (id: string, newTitle: string) => void;
  previousExportCounts?: Map<string, number>;
  onBack: () => void;
  onExecute: () => void;
  isProcessing: boolean;
  onDownloadZip: () => void;
  autoDownload: boolean;
  setAutoDownload: (auto: boolean) => void;
}

export const Step4Copyright: React.FC<Step4CopyrightProps> = ({
  files,
  format,
  preset,
  metadata,
  setMetadata,
  onUpdateFileTitle,
  previousExportCounts,
  onBack,
  onExecute,
  isProcessing,
  onDownloadZip,
  autoDownload,
  setAutoDownload,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const formatLabels: Record<AudioFormat, string> = {
    ogg: 'OGG Vorbis (~3MB)',
    mp3: 'MP3 (320 kbps)',
    wav24: 'WAV 24-bit Studio Lossless',
    wav16: 'WAV 16-bit Master',
    flac: 'FLAC Lossless',
    m4a: 'M4A 320 kbps Apple',
  };
  const formatLabel = formatLabels[format];
  const extStr = format === 'ogg' ? 'ogg' : format === 'mp3' ? 'mp3' : format === 'flac' ? 'flac' : format === 'm4a' ? 'm4a' : 'wav';

  const resolvedTitleItems = resolveUniqueQueueTitles(
    files,
    metadata.titleMode,
    metadata.customTitle,
    previousExportCounts
  );
  const resolvedMap = new Map(resolvedTitleItems.map((r) => [r.id, r]));
  const hasAnyDuplicateNumbering = resolvedTitleItems.some((r) => r.isDuplicateNumbered);

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const isAllCompleted = files.length > 0 && completedCount === files.length;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setMetadata({
        ...metadata,
        coverArtFile: file,
        coverArtUrl: previewUrl,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
            LANGKAH 4 DARI 4
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-0.5">
            Hak Cipta & Eksekusi Master
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Konfigurasi metadata ID3v2 kepemilikan Anda sendiri dan periksa ringkasan sebelum proses dimulai.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Metadata & ID3 (7 cols) */}
        <div className="lg:col-span-7 bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-white/[0.08]">
            <h3 className="text-sm sm:text-base font-semibold text-white">
              Label Kepemilikan & Tag ID3v2
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Informasi hak cipta, nama artis, dan cover art yang akan tertanam permanen di properti audio.
            </p>
          </div>

          {/* Title Mode */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                Judul Lagu (Title) &amp; Penomoran Otomatis:
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Auto-Number Duplikat Aktif</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetadata({ ...metadata, titleMode: 'auto' })}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
                  metadata.titleMode === 'auto'
                    ? 'bg-[#2c2e38] text-white border-white/20 shadow-sm font-medium'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto Deteksi Judul Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setMetadata({ ...metadata, titleMode: 'custom' })}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
                  metadata.titleMode === 'custom'
                    ? 'bg-[#2c2e38] text-white border-white/20 shadow-sm font-medium'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/20'
                }`}
              >
                <span>Kustom Judul</span>
              </button>
            </div>

            {metadata.titleMode === 'custom' && (
              <div className="space-y-1">
                <input
                  type="text"
                  value={metadata.customTitle}
                  onChange={(e) => setMetadata({ ...metadata, customTitle: e.target.value })}
                  placeholder="Masukkan judul lagu (jika >1 lagu, otomatis diberi nomor 1, 2, dst.)..."
                  className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition"
                />
              </div>
            )}

            {/* Live Preview of Auto-Detected & Auto-Numbered Titles */}
            {files.length > 0 && (
              <div className="bg-black/30 border border-white/[0.08] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {metadata.titleMode === 'auto'
                        ? 'Hasil Auto-Deteksi Judul Audio:'
                        : 'Preview Judul Kustom & Penomoran:'}
                    </span>
                  </span>
                  {hasAnyDuplicateNumbering && (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />
                      <span>Judul Sama Otomatis Dinomori</span>
                    </span>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {files.map((f, idx) => {
                    const rInfo = resolvedMap.get(f.id);
                    const finalTitle = rInfo ? rInfo.resolvedTitle : cleanTitleFromFileName(f.name);
                    const isDup = rInfo?.isDuplicateNumbered;
                    const seqNum = rInfo?.sequenceNumber || idx + 1;

                    return (
                      <div
                        key={f.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {idx + 1}.
                          </span>
                          {metadata.titleMode === 'auto' && onUpdateFileTitle ? (
                            <input
                              type="text"
                              value={f.detectedTitle ?? cleanTitleFromFileName(f.name)}
                              onChange={(e) => onUpdateFileTitle(f.id, e.target.value)}
                              title="Klik untuk mengedit judul dasar lagu ini"
                              className="bg-transparent text-zinc-200 font-medium text-xs focus:outline-none focus:bg-black/40 focus:px-1.5 rounded w-full truncate border border-transparent focus:border-white/20"
                            />
                          ) : (
                            <span className="text-zinc-300 truncate">{f.name}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {metadata.titleMode === 'auto' && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.06]">
                              {f.titleSource === 'tag' ? 'Tag Audio' : 'Nama File'}
                            </span>
                          )}
                          {isDup && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                              +#{seqNum}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded truncate max-w-[190px]">
                            {finalTitle}.{extStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Copyright Notice */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">
              Hak Cipta / Copyright Notice (©):
            </label>
            <input
              type="text"
              value={metadata.copyrightNotice}
              onChange={(e) => setMetadata({ ...metadata, copyrightNotice: e.target.value })}
              className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition"
            />
            <div className="text-[10px] text-zinc-400">
              Tercatat permanen di tab Rincian / Details Windows Explorer & macOS Finder
            </div>
          </div>

          {/* Artist & Album */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                Nama Artis / Creator:
              </label>
              <input
                type="text"
                value={metadata.artistName}
                onChange={(e) => setMetadata({ ...metadata, artistName: e.target.value })}
                className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                Nama Album / Single:
              </label>
              <input
                type="text"
                value={metadata.albumName}
                onChange={(e) => setMetadata({ ...metadata, albumName: e.target.value })}
                className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition"
              />
            </div>
          </div>

          {/* Year */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">
              Tahun Rilis:
            </label>
            <input
              type="text"
              value={metadata.releaseYear}
              onChange={(e) => setMetadata({ ...metadata, releaseYear: e.target.value })}
              className="w-full sm:w-36 bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition"
            />
          </div>

          {/* Cover Art Upload */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                Cover Art Thumbnail
              </label>
              <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
                Opsional
              </span>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />

            <div className="flex items-center gap-3">
              {metadata.coverArtUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={metadata.coverArtUrl}
                    alt="Cover art preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/[0.04] border border-dashed border-white/15 flex items-center justify-center text-zinc-400 shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Pilih Gambar Cover (JPG/PNG)</span>
                </button>
                <div className="text-[10px] text-zinc-400">
                  Ditanamkan ke metadata file audio hasil ekspor
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Summary (5 cols) */}
        <div className="lg:col-span-5 bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm sm:text-base font-semibold text-white">
                Rangkuman Master
              </h3>
              <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-2 py-0.5 rounded">
                SIAP DIEKSEKUSI
              </span>
            </div>

            {/* Metrics List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400">Total Berkas:</span>
                <span className="font-semibold text-white font-mono">{files.length} Lagu</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400">Format Output:</span>
                <span className="font-semibold text-zinc-200 font-mono">{formatLabel}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400">Preset Mastering:</span>
                <span className="font-semibold text-zinc-200 font-mono">
                  {preset.name}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400">Binary C2PA Purge:</span>
                <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Aktif (Manifest Stripped)</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                <span className="text-zinc-400">Volume & Amplify:</span>
                <span className="font-semibold text-zinc-200 font-mono flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{preset.targetLufs} LUFS Parity (Terjaga)</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-zinc-400">Dynamic Glue:</span>
                <span className="font-semibold text-zinc-200 font-mono">
                  Compressor + Tanh Soft Limiter
                </span>
              </div>
            </div>

            {/* Auto download toggle */}
            <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={autoDownload}
                onChange={(e) => setAutoDownload(e.target.checked)}
                className="w-4 h-4 rounded accent-white bg-zinc-800 border-zinc-700"
              />
              <span>Unduh otomatis setelah selesai dirender</span>
            </label>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onExecute}
              disabled={isProcessing || files.length === 0}
              className={`w-full py-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm border border-white/20 ${
                isProcessing
                  ? 'bg-white/10 text-zinc-400 cursor-wait'
                  : 'bg-[#2c2e38] hover:bg-[#363845] text-white active:scale-95'
              }`}
            >
              <Zap className={`w-4 h-4 ${isProcessing ? 'animate-spin' : 'text-zinc-200'}`} />
              <span>
                {isProcessing
                  ? 'Sedang Memproses Master Audio...'
                  : 'Bersihkan & Remaster Sekarang'}
              </span>
            </button>

            {isAllCompleted && (
              <button
                onClick={onDownloadZip}
                className="w-full py-2.5 rounded-xl font-medium text-xs bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 flex items-center justify-center gap-2 transition"
              >
                <Package className="w-4 h-4" />
                <span>Unduh Semua Berkas (.ZIP)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Results Card if processing or completed */}
      {(isProcessing || files.some((f) => f.status === 'completed')) && (
        <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">Status Render Antrean</h4>
              <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
                {completedCount} / {files.length} Selesai
              </span>
            </div>

            {isAllCompleted && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Semua File Selesai Disanitasi!</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {files.map((file) => {
              const rInfo = resolvedMap.get(file.id);
              const finalTitle = file.resolvedTitle || rInfo?.resolvedTitle || cleanTitleFromFileName(file.name);
              const downloadName = file.resultFileName || `${finalTitle}.${extStr}`;

              return (
                <div
                  key={file.id}
                  className="bg-[#181920] border border-white/[0.06] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate flex items-center gap-2">
                      <span>{finalTitle}</span>
                      <span className="text-[10px] font-mono text-zinc-500 font-normal truncate">
                        ({file.name})
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {file.status === 'completed'
                        ? `✓ C2PA Purged • Judul ID3: "${finalTitle}" • ${formatLabel}`
                        : file.status === 'processing'
                        ? `${file.statusMessage || 'Memproses DSP mastering...'} (${file.progress}%)`
                        : 'Menunggu antrean...'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.status === 'processing' && (
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-200"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                    )}

                    {file.status === 'completed' && file.resultUrl && (
                      <a
                        href={file.resultUrl}
                        download={downloadName}
                        className="bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-sm active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh ({downloadName})</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-white/[0.08] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Preset Audio</span>
        </button>
      </div>
    </div>
  );
};
