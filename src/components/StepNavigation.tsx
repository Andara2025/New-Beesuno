import React from 'react';
import { AudioFormat } from '../types';
import { ShieldCheck, Music2, Cpu } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  fileCount: number;
  selectedFormat: AudioFormat;
  presetName: string;
  creatorName: string;
  c2paStrippedBytes: number;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  setCurrentStep,
  fileCount,
  selectedFormat,
  presetName,
  creatorName,
  c2paStrippedBytes,
}) => {
  const formatLabel: Record<AudioFormat, string> = {
    ogg: 'OGG Vorbis (~2.5MB)',
    mp3: 'MP3 (320 kbps)',
    wav24: 'WAV 24-bit Studio',
    wav16: 'WAV 16-bit Master',
    flac: 'FLAC Lossless',
    m4a: 'M4A 320k',
  };

  const steps = [
    { num: 1, title: 'Input Audio', sub: `${fileCount} File` },
    { num: 2, title: 'Format Output', sub: formatLabel[selectedFormat] },
    { num: 3, title: 'Preset Audio', sub: presetName.split(' ')[0] },
    { num: 4, title: 'Hak Cipta', sub: creatorName || 'Official Creator' },
  ];

  return (
    <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 mb-6 shadow-sm">
      {/* Top Banner & Status Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Studio Master Pipeline
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Purge metadata C2PA, pertahankan amplify & volume, dan remaster ke standar -14 LUFS streaming.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white/[0.04] border border-white/[0.06] px-3 py-1 rounded-lg text-right">
            <div className="text-[9px] font-mono text-zinc-400 uppercase">C2PA Shield</div>
            <div className="text-xs font-mono font-medium text-zinc-200">
              {c2paStrippedBytes > 0 ? `${(c2paStrippedBytes / 1024).toFixed(1)} KB Purged` : 'Active'}
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.06] px-3 py-1 rounded-lg text-right">
            <div className="text-[9px] font-mono text-zinc-400 uppercase">Container</div>
            <div className="text-xs font-mono font-medium text-zinc-200">
              {selectedFormat.toUpperCase()} (320K)
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.06] px-3 py-1 rounded-lg text-right">
            <div className="text-[9px] font-mono text-zinc-400 uppercase">Loudness Target</div>
            <div className="text-xs font-mono font-medium text-zinc-200">
              -14 LUFS Parity
            </div>
          </div>
        </div>
      </div>

      {/* 4 Interactive Process Steps (macOS Segmented Bar) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-4">
        {steps.map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;

          return (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-[#262833] border-white/30 text-white shadow-sm ring-1 ring-white/10'
                  : isDone
                  ? 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:border-white/20'
                  : 'bg-white/[0.02] border-white/[0.04] text-zinc-500 hover:border-white/[0.08]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#363845] text-white font-medium border border-white/20'
                    : isDone
                    ? 'bg-white/[0.1] text-zinc-200 border border-white/20'
                    : 'bg-white/[0.06] text-zinc-500'
                }`}
              >
                {s.num}
              </div>

              <div className="min-w-0">
                <div className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                  {s.title}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {s.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
