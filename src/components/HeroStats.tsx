import React from 'react';
import { ShieldCheck, Waves, History, Sliders } from 'lucide-react';
import { AudioEngineStats } from '../types';

interface HeroStatsProps {
  stats: AudioEngineStats;
  onShowPresets: () => void;
  onShowHistory: () => void;
  userName?: string;
}

export const HeroStats: React.FC<HeroStatsProps> = ({
  stats,
  onShowPresets,
  onShowHistory,
  userName = 'Sulthan Adimas',
}) => {
  return (
    <div className="mb-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <span>Studio Remaster Workstation</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Sanitasi metadata C2PA, pertahankan amplify & volume lagu, dan mastering streaming -14 LUFS standar industri.
          </p>
        </div>

        {/* Utility Chips: Katalog Preset & Riwayat Render */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={onShowPresets}
            className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 px-3.5 py-1.5 rounded-xl text-xs font-medium border border-white/[0.08] transition shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>Katalog Preset</span>
          </button>

          <button
            onClick={onShowHistory}
            className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 px-3.5 py-1.5 rounded-xl text-xs font-medium border border-white/[0.06] transition"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span>Riwayat Render</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards (macOS Minimalist Surface) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Rendered */}
        <div className="bg-[#14151b] border border-white/[0.08] rounded-xl p-3.5 hover:border-white/[0.15] transition shadow-sm">
          <div className="text-[11px] font-medium text-zinc-400">Total Dirender</div>
          <div className="text-lg sm:text-xl font-semibold text-white mt-1">
            {stats.totalRendered} Lagu
          </div>
        </div>

        {/* Akselerasi Perangkat Keras */}
        <div className="bg-[#14151b] border border-white/[0.08] rounded-xl p-3.5 hover:border-white/[0.15] transition shadow-sm">
          <div className="text-[11px] font-medium text-zinc-400">Akselerasi Audio Engine</div>
          <div className="text-sm sm:text-base font-semibold text-zinc-200 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Web Audio 64-bit Wasm</span>
          </div>
        </div>

        {/* C2PA Stripper Shield */}
        <div className="bg-[#14151b] border border-white/[0.08] rounded-xl p-3.5 hover:border-white/[0.15] transition shadow-sm">
          <div className="text-[11px] font-medium text-zinc-400">C2PA Stripper Shield</div>
          <div className="text-sm sm:text-base font-semibold text-zinc-200 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>{stats.c2paBytesStrippedTotal > 0 ? `${(stats.c2paBytesStrippedTotal / 1024).toFixed(1)} KB Purged` : 'Active'}</span>
          </div>
        </div>

        {/* Dynamic Loudness Parity */}
        <div className="bg-[#14151b] border border-white/[0.08] rounded-xl p-3.5 hover:border-white/[0.15] transition shadow-sm">
          <div className="text-[11px] font-medium text-zinc-400">Volume & Amplify Control</div>
          <div className="text-sm sm:text-base font-semibold text-zinc-200 mt-1 flex items-center gap-1.5">
            <Waves className="w-4 h-4 text-zinc-400" />
            <span>Volume Parity + Glue</span>
          </div>
        </div>
      </div>
    </div>
  );
};
