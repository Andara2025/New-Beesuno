import React from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { MASTERING_PRESETS } from '../utils/presets';
import { MasteringPreset } from '../types';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPresetId: string;
  onSelectPreset: (preset: MasteringPreset) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  currentPresetId,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-[#14151b] border border-white/[0.1] rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-white" />
            <h3 className="text-base font-semibold text-white">Katalog Racikan Preset Master</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {MASTERING_PRESETS.map((p) => {
            const isSelected = p.id === currentPresetId;
            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectPreset(p);
                  onClose();
                }}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white/[0.08] border-white/40 ring-1 ring-white/20'
                    : 'bg-[#181920] border-white/[0.06] hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white">{p.name}</span>
                    <span className="text-[9px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                    {p.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Pitch: {p.pitchDetuneCents}c</span>
                  <span>Target: {p.targetLufs} LUFS</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
