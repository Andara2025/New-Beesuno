import React, { useState } from 'react';
import { Download, Link as LinkIcon, Sparkles, CheckCircle2, Loader2, ExternalLink, ArrowRight } from 'lucide-react';

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

interface SunoDownloaderCardProps {
  onImportToRemaster?: (file: File) => void;
}

export const SunoDownloaderCard: React.FC<SunoDownloaderCardProps> = ({ onImportToRemaster }) => {
  const [sunoUrl, setSunoUrl] = useState<string>('https://suno.com/s/thfpbMQ7o3ZldFiM');
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<SunoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDuration = (sec: number | undefined) => {
    if (!sec || isNaN(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleParse = async (urlToParse = sunoUrl) => {
    if (!urlToParse.trim()) {
      setError('Masukkan tautan lagu Suno terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);

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
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses tautan.');
    } finally {
      setLoading(false);
    }
  };

  const getDirectDownloadUrl = (songId: string, format: 'mp3' | 'm4a' | 'ogg', title: string) => {
    const cleanTitle = (title || 'Suno_Track').replace(/[\\/:*?"<>|]/g, '_');
    return `/api/suno/download?id=${encodeURIComponent(songId)}&format=${format}&title=${encodeURIComponent(cleanTitle)}`;
  };

  const handleDownload = () => {
    setError(null);
    setDownloading(true);
    window.setTimeout(() => {
      setDownloading(false);
    }, 1800);
  };

  const handleImportDirect = async () => {
    if (!metadata || !onImportToRemaster) return;
    setDownloading(true);
    setError(null);
    try {
      const url = getDirectDownloadUrl(metadata.songId, 'mp3', metadata.title);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengunduh berkas audio.');
      const blob = await res.blob();
      const file = new File([blob], `${metadata.title}.mp3`, { type: 'audio/mpeg' });
      onImportToRemaster(file);
    } catch (err: any) {
      setError(err.message || 'Gagal mengimpor ke Studio Remaster.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/10 text-white flex items-center justify-center font-medium">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
              <span>Suno Song Downloader & Direct Decryptor</span>
              <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
                PRO
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Tempel tautan lagu Suno (termasuk <code className="text-zinc-300 font-mono">suno.com/s/...</code>) untuk membedah & mengunduh audio asli.
            </p>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <LinkIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={sunoUrl}
            onChange={(e) => setSunoUrl(e.target.value)}
            placeholder="Contoh: https://suno.com/s/thfpbMQ7o3ZldFiM atau suno.com/song/..."
            className="w-full bg-black/30 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono transition"
          />
        </div>

        <button
          onClick={() => handleParse()}
          disabled={loading}
          className="bg-[#2c2e38] hover:bg-[#363845] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition shadow-sm border border-white/15 shrink-0 active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Ambil Audio</span>
            </>
          )}
        </button>
      </div>

      {/* Quick sample chips */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[10px] text-zinc-400 font-mono uppercase">Contoh:</span>
        <button
          type="button"
          onClick={() => {
            const url = 'https://suno.com/s/thfpbMQ7o3ZldFiM';
            setSunoUrl(url);
            handleParse(url);
          }}
          className="text-[11px] text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-white/[0.06] flex items-center gap-1.5 font-mono transition"
        >
          <span>suno.com/s/thfpbMQ7o3ZldFiM (Alfatihah)</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Parsed Result Card */}
      {metadata && (
        <div className="bg-black/40 border border-white/[0.1] rounded-xl p-4 space-y-3 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <img
                src={metadata.imageUrl}
                alt={metadata.title}
                className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">{metadata.title}</h4>
                  <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-1.5 py-0.5 rounded border border-white/10 uppercase font-medium">
                    {metadata.model.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex items-center flex-wrap gap-2 mt-0.5">
                  <span>Pencipta: <strong className="text-zinc-200">{metadata.artist}</strong></span>
                  <span>•</span>
                  <span>Durasi: <strong className="text-zinc-200 font-mono">{formatDuration(metadata.duration)}</strong></span>
                  <span>•</span>
                  <span>ID: <code className="font-mono text-[10px] text-zinc-500">{metadata.songId.substring(0, 8)}...</code></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <a
                href={getDirectDownloadUrl(metadata.songId, 'mp3', metadata.title)}
                download={`${metadata.title}.mp3`}
                onClick={handleDownload}
                className="flex-1 sm:flex-none bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh MP3</span>
              </a>

              <a
                href={getDirectDownloadUrl(metadata.songId, 'ogg', metadata.title)}
                download={`${metadata.title}.ogg`}
                onClick={handleDownload}
                className="flex-1 sm:flex-none bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>OGG</span>
              </a>

              {onImportToRemaster && (
                <button
                  type="button"
                  onClick={handleImportDirect}
                  disabled={downloading}
                  className="flex-1 sm:flex-none bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                  <span>{downloading ? 'Mengimpor...' : 'Impor ke Remaster →'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400 flex items-center justify-between">
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Dekripsi Audio Berhasil</span>
            </span>
            <a
              href={metadata.shortlink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white flex items-center gap-1 font-mono text-[10px]"
            >
              <span>Buka di Suno</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
