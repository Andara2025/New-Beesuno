import React from 'react';
import { ArrowLeft, ArrowRight, Lightbulb, Check } from 'lucide-react';
import { AudioFormat } from '../types';

interface Step2FormatOutputProps {
  selectedFormat: AudioFormat;
  setSelectedFormat: (format: AudioFormat) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2FormatOutput: React.FC<Step2FormatOutputProps> = ({
  selectedFormat,
  setSelectedFormat,
  onBack,
  onNext,
}) => {
  const formats: {
    id: AudioFormat;
    badge: string;
    ext: string;
    title: string;
    desc: string;
  }[] = [
    {
      id: 'mp3',
      badge: 'STANDAR',
      ext: '.MP3',
      title: 'MP3 — 320 kbps',
      desc: 'Universal HQ Streaming (Kompatibel semua pemutar)',
    },
    {
      id: 'ogg',
      badge: 'RINGAN',
      ext: '.OGG',
      title: 'OGG Vorbis',
      desc: 'Ukuran Sangat Ringan (~3 MB), Cepat Upload ke Suno',
    },
    {
      id: 'wav24',
      badge: 'STUDIO',
      ext: '.WAV',
      title: 'WAV — 24-bit',
      desc: 'Master DAW Lossless Resolusi Tertinggi',
    },
    {
      id: 'wav16',
      badge: 'AGREGATOR',
      ext: '.WAV',
      title: 'WAV — 16-bit',
      desc: 'Standar Distribusi Digital & DistroKid/TuneCore',
    },
    {
      id: 'flac',
      badge: 'LOSSLESS',
      ext: '.FLAC',
      title: 'FLAC Pure',
      desc: 'Bit-perfect Free Lossless Audio Codec',
    },
    {
      id: 'm4a',
      badge: 'APPLE',
      ext: '.M4A',
      title: 'M4A — 320 kbps',
      desc: 'AAC High-Efficiency Ekosistem Apple',
    },
  ];

  const getFormatTip = (f: AudioFormat) => {
    switch (f) {
      case 'ogg':
        return 'OGG Vorbis: Format sangat efisien dan hemat ukuran berkas (~3 MB). Pilihan tepat jika ingin file audio ringkas dan cepat saat diunggah kembali ke Suno AI.';
      case 'mp3':
        return 'MP3 320 kbps (CBR): Format paling universal. Mendukung penanaman cover art album dan ID3v2 metadata lengkap di semua perangkat dan sistem operasi.';
      case 'wav24':
        return 'WAV 24-bit: Preservasi dynamic range studio mastering profesional. Cocok untuk project DAW master dan arsip audio beresolusi tinggi.';
      case 'wav16':
        return 'WAV 16-bit (44.1 kHz): Format standar emas industri agregator distribusi digital (DistroKid, TuneCore, Spotify, Apple Music) tanpa kompresi lossy.';
      case 'flac':
        return 'FLAC Pure: Kompresi tanpa kehilangan data audio (lossless bit-perfect). Ukuran berkas ~40% lebih ramping dibanding WAV tanpa kompromi kualitas.';
      case 'm4a':
        return 'M4A 320 kbps (AAC): Format native Apple Music dan QuickTime dengan kejernihan frekuensi nada tinggi yang sangat halus.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
            LANGKAH 2 DARI 4
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-0.5">
            Format Audio Output
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Pilih kontainer audio & resolusi bit komersial untuk distribusi atau kebutuhan studio.
          </p>
        </div>
      </div>

      {/* Format Selection Cards (macOS Minimalist Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {formats.map((f) => {
          const isSelected = selectedFormat === f.id;
          return (
            <div
              key={f.id}
              onClick={() => setSelectedFormat(f.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative group ${
                isSelected
                  ? 'bg-[#262833] border-white/30 ring-1 ring-white/10 shadow-sm'
                  : 'bg-[#14151b] border-white/[0.06] hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/10 text-zinc-200 border border-white/15'
                        : 'bg-white/[0.06] text-zinc-400'
                    }`}
                  >
                    {f.badge}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {f.ext}
                  </span>
                </div>

                <div className="text-sm font-semibold text-white mb-1">
                  {f.title}
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed">
                  {f.desc}
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-zinc-200 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Terpilih</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanatory Callout Banner */}
      <div className="bg-[#14151b] border border-white/[0.08] rounded-xl p-4 flex items-start gap-3 text-xs text-zinc-300">
        <Lightbulb className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          {getFormatTip(selectedFormat)}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-white/[0.08] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Input Audio</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-[#2c2e38] hover:bg-[#363845] text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition shadow-sm border border-white/15 active:scale-95"
        >
          <span>Lanjut ke Preset Audio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
