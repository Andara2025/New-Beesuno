import React from 'react';
import { Volume2, Sparkles, ShieldCheck, Download, Plus, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'cloaker' | 'armor' | 'downloader' | 'remaster' | 'batch';
  setActiveTab: (tab: 'cloaker' | 'armor' | 'downloader' | 'remaster' | 'batch') => void;
  onAddFileClick: () => void;
  currentTimeStr: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onAddFileClick,
  currentTimeStr,
}) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#121318]/90 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand & macOS Window Traffic Lights */}
        <div className="flex items-center gap-3 shrink-0">
          {/* macOS Traffic Lights */}
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/20 inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/20 inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/20 inline-block shadow-sm"></span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white text-black font-black flex items-center justify-center text-sm tracking-tighter shadow-sm">
              B
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white text-sm sm:text-base tracking-tight">Beesuno</span>
              <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-1.5 py-0.5 rounded border border-white/[0.08]">
                Pro Audio
              </span>
            </div>
          </div>
        </div>

        {/* Center Tabs - macOS Segmented Control */}
        <nav aria-label="Main Workflow" className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] overflow-x-auto max-w-full scrollbar-none gap-1 shrink-0">
          {/* Tab 1: Cloaker */}
          <button
            onClick={() => setActiveTab('cloaker')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 select-none ${
              activeTab === 'cloaker'
                ? 'bg-[#2c2e38] text-white font-medium shadow-sm border border-white/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>1. Naskah Vokal</span>
          </button>

          {/* Tab 2: Armor */}
          <button
            onClick={() => setActiveTab('armor')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 select-none ${
              activeTab === 'armor'
                ? 'bg-[#2c2e38] text-white font-medium shadow-sm border border-white/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>2. Upload Armor</span>
          </button>

          {/* Tab 3: Suno Downloader */}
          <button
            onClick={() => setActiveTab('downloader')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 select-none ${
              activeTab === 'downloader'
                ? 'bg-[#2c2e38] text-white font-medium shadow-sm border border-white/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>3. Downloader</span>
          </button>

          {/* Tab 4: Remaster */}
          <button
            onClick={() => setActiveTab('remaster')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 select-none ${
              activeTab === 'remaster'
                ? 'bg-[#2c2e38] text-white font-medium shadow-sm border border-white/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span>4. Studio Remaster</span>
          </button>
        </nav>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden lg:block text-[11px] font-mono text-zinc-400">
            {currentTimeStr}
          </div>

          <button
            onClick={onAddFileClick}
            className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tambah File</span>
            <span className="sm:hidden">+ File</span>
          </button>

          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-xs font-medium text-white">
            S
          </div>
        </div>
      </div>
    </header>
  );
};
