import React from 'react';

interface FooterBarProps {
  targetLufs: number;
}

export const FooterBar: React.FC<FooterBarProps> = ({ targetLufs }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#121318]/90 border-t border-white/[0.08] px-4 py-1.5 backdrop-blur-xl text-[11px] font-mono text-zinc-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Mastering Engine Ready</span>
          </div>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-300">
            Target {targetLufs} LUFS • Volume Parity On
          </span>
        </div>

        <div className="flex items-center gap-3 text-zinc-400 text-[10px]">
          <span>Audio Engine: 64-bit Wasm</span>
          <span>•</span>
          <span>Glue Compressor: Active</span>
          <span>•</span>
          <span className="text-zinc-200 font-medium">Beesuno macOS Edition</span>
        </div>
      </div>
    </footer>
  );
};
