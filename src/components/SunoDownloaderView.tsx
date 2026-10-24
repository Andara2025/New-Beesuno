import React, { useState, useEffect } from 'react';
import {
  Download,
  Link as LinkIcon,
  Sparkles,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  Play,
  Pause,
  FileAudio,
} from 'lucide-react';

interface SunoMetadata {
  songId: string;
  title: string;
  artist: string;
  imageUrl: string;
  prompt: string;
  duration: number;
  model: string;
  shortlink: string;
}

interface SunoDownloaderViewProps {
  onImportToRemaster: (file: File) => void;
  onNavigateTab: (tab: 'cloaker' | 'armor' | 'downloader' | 'remaster') => void;
}

export const SunoDownloaderView: React.FC<SunoDownloaderViewProps> = ({
  onImportToRemaster,
}) => {
  const [sunoUrl, setSunoUrl] = useState<string>('https://suno.com/s/thfpbMQ7o3ZldFiM');
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<SunoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const formatDuration = (sec: number | undefined) => {
    if (!sec || isNaN(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-parse default URL on initial load
  useEffect(() => {
    handleParse('https://suno.com/s/thfpbMQ7o3ZldFiM');
  }, []);

  const handleParse = async (urlToParse = sunoUrl) => {
    if (!urlToParse.trim()) {
      setError('Masukkan tautan lagu Suno terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const res = await fetch('/api/suno/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToParse.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membedah tautan Suno.');
      }

      setMetadata(data.metadata);
      setAudioUrl(`/api/suno/download?id=${data.metadata.songId}&format=mp3&title=${encodeURIComponent(data.metadata.title)}`);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses tautan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'mp3' | 'm4a' | 'ogg') => {
    if (!metadata) return;
    setDownloading(true);
    setError(null);
    try {
      const url = `/api/suno/download?id=${metadata.songId}&format=${format}&title=${encodeURIComponent(metadata.title)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Gagal mengunduh berkas audio (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${metadata.title}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengunduh audio Suno.');
    } finally {
      setDownloading(false);
    }
  };

  const handleImportDirect = async () => {
    if (!metadata) return;
    setImporting(true);
    try {
      const url = `/api/suno/download?id=${metadata.songId}&format=mp3&title=${encodeURIComponent(metadata.title)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengunduh audio untuk remaster.');
      const blob = await res.blob();
      const file = new File([blob], `${metadata.title}_SunoMaster.mp3`, { type: 'audio/mpeg' });
      onImportToRemaster(file);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim berkas ke Studio Remaster.');
      setImporting(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Suno Song Downloader
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Unduh audio resolusi tinggi langsung dari tautan Suno.com tanpa kompresi ganda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg">
            DRM Decryptor Ready
          </span>
        </div>
      </div>

      {/* Main Container Card (macOS Style) */}
      <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Input Bar */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sunoUrl}
                onChange={(e) => setSunoUrl(e.target.value)}
                placeholder="Tempel link Suno (contoh: https://suno.com/s/thfpbMQ7o3ZldFiM)"
                className="w-full bg-black/30 border border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono transition"
              />
            </div>

            <button
              onClick={() => handleParse()}
              disabled={loading}
              className="bg-[#2c2e38] hover:bg-[#363845] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition shadow-sm border border-white/15 active:scale-95 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-zinc-300" />
                  <span>Ambil Audio</span>
                </>
              )}
            </button>
          </div>

          {/* Quick preset chip */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Contoh:</span>
            <button
              type="button"
              onClick={() => {
                const url = 'https://suno.com/s/thfpbMQ7o3ZldFiM';
                setSunoUrl(url);
                handleParse(url);
              }}
              className="text-xs text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-2.5 py-1 rounded-lg font-mono transition flex items-center gap-1.5"
            >
              <span>suno.com/s/thfpbMQ7o3ZldFiM (Alfatihah)</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Decrypted Preview Box */}
        {metadata && (
          <div className="bg-black/40 border border-white/[0.1] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Audio Siap Diunduh</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                ID: {metadata.songId.substring(0, 12)}...
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Cover Art */}
              <div className="md:col-span-3 flex justify-center">
                <div className="relative group cursor-pointer" onClick={togglePlay}>
                  <img
                    src={metadata.imageUrl}
                    alt={metadata.title}
                    className="w-32 h-32 rounded-xl object-cover border border-white/10 shadow-md"
                  />
                  <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white fill-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white fill-white ml-0.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Info Details & Actions */}
              <div className="md:col-span-9 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{metadata.title}</h3>
                    <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08] uppercase font-medium">
                      {metadata.model.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                    <span>Artis: <strong className="text-zinc-200">{metadata.artist}</strong></span>
                    <span>•</span>
                    <span>Durasi: <strong className="text-zinc-200 font-mono">{formatDuration(metadata.duration)}</strong></span>
                  </p>
                </div>

                {/* Built-in Audio Player */}
                {audioUrl && (
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5 flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="w-8 h-8 rounded-lg bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 flex items-center justify-center font-bold transition shadow-sm shrink-0 active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        preload="metadata"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        onError={() => setAudioError('Gagal memutar preview audio.')}
                        className="w-full h-7"
                        controls
                      />
                      {audioError && (
                        <div className="text-[10px] text-rose-400 mt-1">{audioError}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => handleDownload('mp3')}
                    disabled={downloading}
                    className="bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Unduh MP3</span>
                  </button>

                  <button
                    onClick={() => handleDownload('ogg')}
                    disabled={downloading}
                    className="bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Unduh OGG</span>
                  </button>

                  <button
                    onClick={() => handleDownload('m4a')}
                    className="bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <FileAudio className="w-3.5 h-3.5 text-zinc-400" />
                    <span>M4A</span>
                  </button>

                  <button
                    onClick={handleImportDirect}
                    disabled={importing}
                    className="bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow-sm active:scale-95"
                  >
                    {importing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
                    )}
                    <span>{importing ? 'Mengimpor...' : 'Kirim ke Remaster →'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt details preview if available */}
            {metadata.prompt && (
              <div className="pt-2 border-t border-white/[0.06] text-xs">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Prompt Asli:</span>
                <div className="mt-1 bg-black/30 border border-white/[0.06] rounded-xl p-2.5 font-mono text-[11px] text-zinc-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {metadata.prompt}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
