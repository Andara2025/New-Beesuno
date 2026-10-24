import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, RotateCcw, ArrowLeft, ArrowRight, Sliders, CheckCircle2, Sparkles, Scissors, Music, Layers, ShieldCheck } from 'lucide-react';
import { MasteringPreset, AudioFileItem } from '../types';
import { MASTERING_PRESETS } from '../utils/presets';
import { StudioLivePlayer } from '../utils/audioEngine';

interface Step3PresetAudioProps {
  preset: MasteringPreset;
  setPreset: (preset: MasteringPreset) => void;
  activeFile: AudioFileItem | null;
  onBack: () => void;
  onNext: () => void;
}

export const Step3PresetAudio: React.FC<Step3PresetAudioProps> = ({
  preset,
  setPreset,
  activeFile,
  onBack,
  onNext,
}) => {
  const [mode, setMode] = useState<'simple' | 'pro'>('pro');
  const [isPlaying, setIsPlaying] = useState(false);
  const [abMode, setAbMode] = useState<'remaster' | 'original'>('remaster');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [volume, setVolume] = useState(0.85);

  const playerRef = useRef<StudioLivePlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

  // Initialize live player
  useEffect(() => {
    const player = new StudioLivePlayer();
    playerRef.current = player;

    if (activeFile && activeFile.originalAudioBuffer) {
      player.setBuffer(activeFile.originalAudioBuffer);
      setDuration(Math.min(15, activeFile.originalAudioBuffer.duration));
    }

    return () => {
      player.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeFile]);

  // Update DSP in live player whenever preset changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.applyPreset(preset);
    }
  }, [preset]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.applyPreset(preset);
      playerRef.current.setMode(abMode);
      playerRef.current.play(preset);
      setIsPlaying(true);
    }
  };

  // Handle A/B Switch
  const switchAb = (target: 'remaster' | 'original') => {
    setAbMode(target);
    if (playerRef.current) {
      playerRef.current.setMode(target);
    }
  };

  // Real-time animation loop for progress & visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const freqData = new Uint8Array(new ArrayBuffer(64));

    const updateLoop = () => {
      if (playerRef.current && isPlaying) {
        if (!isScrubbingRef.current) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }

        if (canvas && ctx) {
          playerRef.current.getVisualizerData(freqData);
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = canvas.width / 32 - 1.5;
          for (let i = 0; i < 32; i++) {
            const val = freqData[i * 2] / 255;
            const barHeight = val * (canvas.height - 4);
            const x = i * (barWidth + 1.5);
            const y = canvas.height - barHeight;

            const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
            if (abMode === 'remaster') {
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(1, '#a1a1aa');
            } else {
              grad.addColorStop(0, '#71717a');
              grad.addColorStop(1, '#52525b');
            }

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, abMode]);

  const handleSliderChange = <K extends keyof MasteringPreset>(key: K, value: MasteringPreset[K]) => {
    setPreset({
      ...preset,
      [key]: value,
    });
  };

  const applyTemplate = (templateId: string) => {
    const found = MASTERING_PRESETS.find((p) => p.id === templateId);
    if (found) {
      setPreset({ ...found });
    }
  };

  const formatSecs = (sec: number) => {
    const s = Math.floor(sec % 60);
    const m = Math.floor(sec / 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
            LANGKAH 3 DARI 4
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-0.5">
            Preset Studio & Kalibrasi DSP
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Normalisasi -14 LUFS, lem dinamika analog, dan penjagaan volume agar audio hasil remaster lebih bertenaga dari aslinya.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-3 py-1.5 rounded-xl text-xs font-medium self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Amplify & Volume Terjaga</span>
        </div>
      </div>

      {/* Mode Segmented Control (macOS Style) */}
      <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] max-w-md">
        <button
          onClick={() => setMode('simple')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
            mode === 'simple'
              ? 'bg-white text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Preset Siap Pakai
        </button>
        <button
          onClick={() => setMode('pro')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
            mode === 'pro'
              ? 'bg-white text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Studio Custom Lab (DSP Rack)
        </button>
      </div>

      {/* Simple Preset Grid if simple mode is selected */}
      {mode === 'simple' && (
        <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white flex items-center justify-between">
            <span>Pilih Karakter Studio Mastering</span>
            <span className="text-xs font-mono text-zinc-400">Rekomendasi: Studio Master Transparent</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MASTERING_PRESETS.map((p) => {
              const isSelected = preset.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setPreset({ ...p })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white/[0.08] border-white/40 ring-1 ring-white/20'
                      : 'bg-[#181920]/60 border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                      <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-1.5 py-0.5 rounded border border-white/[0.08]">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{p.description}</p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 border-t border-white/[0.06] pt-2">
                    <span className="text-white font-medium">{p.targetLufs} LUFS</span>
                    <span>•</span>
                    <span>Speed: {p.tempoWarpPercent}%</span>
                    <span>•</span>
                    <span>Pitch: {p.pitchDetuneCents}c</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Studio Custom Lab Rack */}
      <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-5 shadow-sm">
        {/* Lab Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 text-white flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-white">
                  Studio Mastering Rack
                </h3>
                <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
                  DSP ACTIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Penyelarasan EQ, saturasi pita tape, glue compressor, dan penyesuaian dimensi stereo.
              </p>
            </div>
          </div>
        </div>

        {/* Live A/B Audio Player Card (macOS Style) */}
        <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-zinc-400" />
                <span>{activeFile ? activeFile.name : 'Suno_Preview_Track.mp3'}</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Mode aktif: {abMode === 'remaster' ? `✨ Remaster Polished (${preset.name})` : '🎧 Audio Asli (Before Raw)'}
              </div>
            </div>

            {/* A/B Switch Segmented Control */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] shrink-0">
              <button
                onClick={() => switchAb('remaster')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  abMode === 'remaster'
                    ? 'bg-[#2c2e38] text-white shadow-sm font-medium border border-white/15'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Remaster (After)</span>
              </button>

              <button
                onClick={() => switchAb('original')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  abMode === 'original'
                    ? 'bg-[#2c2e38] text-white shadow-sm font-medium border border-white/15'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Audio Asli (Before)</span>
              </button>
            </div>
          </div>

          {/* Player Bar & Visualizer */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 flex items-center justify-center shadow-sm transition active:scale-95 shrink-0"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <canvas
              ref={canvasRef}
              width={160}
              height={32}
              className="hidden sm:block rounded-lg bg-black/40 border border-white/[0.08] shrink-0"
            />

            <div className="flex-1 flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400 min-w-[32px]">
                {formatSecs(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 15}
                step={0.1}
                value={currentTime}
                onPointerDown={() => {
                  isScrubbingRef.current = true;
                }}
                onPointerUp={(e) => {
                  isScrubbingRef.current = false;
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  setCurrentTime(val);
                  playerRef.current?.seek(val / (duration || 15));
                }}
                onInput={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  setCurrentTime(val);
                }}
                onChange={(e) => {
                  isScrubbingRef.current = false;
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  playerRef.current?.seek(val / (duration || 15));
                }}
                className="w-full"
              />
              <span className="text-[11px] font-mono text-zinc-400 min-w-[32px]">
                {formatSecs(duration)}
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <Volume2 className="w-4 h-4 text-zinc-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  playerRef.current?.setVolume(val);
                }}
                className="w-16"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-medium mr-1">
              PILIHAN PRESET:
            </span>

            <button
              onClick={() => applyTemplate('studio-master-transparent')}
              className={`border px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                preset.id === 'studio-master-transparent'
                  ? 'bg-[#2c2e38] text-white border-white/20 shadow-sm font-medium'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
              }`}
            >
              <span>★ Studio Master Transparent</span>
            </button>

            <button
              onClick={() => applyTemplate('streaming-punch')}
              className={`border px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                preset.id === 'streaming-punch'
                  ? 'bg-[#2c2e38] text-white border-white/20 shadow-sm font-medium'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
              }`}
            >
              <span>⚡ Streaming Punch (-14 LUFS)</span>
            </button>

            <button
              onClick={() => applyTemplate('vocal-clarity-air')}
              className={`border px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                preset.id === 'vocal-clarity-air'
                  ? 'bg-[#2c2e38] text-white border-white/20 shadow-sm font-medium'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
              }`}
            >
              <span>🎤 Vocal Clarity & Air</span>
            </button>

            <button
              onClick={() => applyTemplate('warm-analog-console')}
              className={`border px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                preset.id === 'warm-analog-console'
                  ? 'bg-[#2c2e38] text-white border-white/20 shadow-sm font-medium'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
              }`}
            >
              <span>📻 Warm Analog Console</span>
            </button>

            <button
              onClick={() => applyTemplate('suno-upload-killer')}
              className={`border px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                preset.id === 'suno-upload-killer'
                  ? 'bg-[#2c2e38] text-white border-white/20 shadow-sm font-medium'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08]'
              }`}
            >
              <span>🛡️ Suno Upload Armor</span>
            </button>
          </div>

          <button
            onClick={() => applyTemplate('studio-master-transparent')}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>

        {/* Section: Tone & Mastering EQ Sliders (macOS Clean Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Sub-Bass Body */}
          <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Sub-Bass Body (60 Hz)</span>
              <span className="text-xs font-mono font-medium text-white bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                {preset.subBassBodyDb > 0 ? `+${preset.subBassBodyDb.toFixed(1)}` : preset.subBassBodyDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min={-4}
              max={8}
              step={0.2}
              value={preset.subBassBodyDb}
              onChange={(e) => handleSliderChange('subBassBodyDb', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-[10px] text-zinc-400">
              Bobot hentakan bass yang padat dan bertenaga
            </div>
          </div>

          {/* Mud Scoop */}
          <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Low-Mid Clean (250 Hz)</span>
              <span className="text-xs font-mono font-medium text-white bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                {preset.lowMidMudScoopDb > 0 ? `+${preset.lowMidMudScoopDb.toFixed(1)}` : preset.lowMidMudScoopDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min={-8}
              max={3}
              step={0.2}
              value={preset.lowMidMudScoopDb}
              onChange={(e) => handleSliderChange('lowMidMudScoopDb', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-[10px] text-zinc-400">
              Membersihkan frekuensi keruh tanpa memotong bodi
            </div>
          </div>

          {/* Vocal Clarity & Presence */}
          <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Vocal Articulation (3.45k)</span>
              <span className="text-xs font-mono font-medium text-white bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                {preset.antiAiVocalNotchDb > 0 ? `+${preset.antiAiVocalNotchDb.toFixed(1)}` : preset.antiAiVocalNotchDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min={-6}
              max={6}
              step={0.2}
              value={preset.antiAiVocalNotchDb}
              onChange={(e) => handleSliderChange('antiAiVocalNotchDb', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-[10px] text-zinc-400">
              Maju-mundurkan kehadiran vokal utama
            </div>
          </div>

          {/* Air Sheen High-Shelf */}
          <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Air Sheen High-Shelf (12k)</span>
              <span className="text-xs font-mono font-medium text-white bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                {preset.airSheenHighShelfDb > 0 ? `+${preset.airSheenHighShelfDb.toFixed(1)}` : preset.airSheenHighShelfDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min={-4}
              max={6}
              step={0.2}
              value={preset.airSheenHighShelfDb}
              onChange={(e) => handleSliderChange('airSheenHighShelfDb', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-[10px] text-zinc-400">
              Kilau frekuensi atas yang halus dan terbuka
            </div>
          </div>

          {/* Analog Tape Warmth */}
          <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Tape Warmth (Saturation)</span>
              <span className="text-xs font-mono font-medium text-white bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                {preset.tapeWarmth.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={1.5}
              step={0.02}
              value={preset.tapeWarmth}
              onChange={(e) => handleSliderChange('tapeWarmth', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-[10px] text-zinc-400">
              Saturasi pita tape analog hangat tanpa distorsi
            </div>
          </div>

          {/* Stereo Width */}
          <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Stereo Field Width</span>
              <span className="text-xs font-mono font-medium text-white bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                {preset.stereoWidthPercent}%
              </span>
            </div>
            <input
              type="range"
              min={90}
              max={140}
              step={2}
              value={preset.stereoWidthPercent}
              onChange={(e) => handleSliderChange('stereoWidthPercent', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-[10px] text-zinc-400">
              Dimensi stereo lebar tanpa masalah phase cancel
            </div>
          </div>
        </div>

        {/* Section: Optional Transposition / Evasion (Collapsed by Default or Compact) */}
        <div className="bg-[#181920]/60 border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Opsi Tambahan (Pitch, Tempo, & Trim Intro)</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              Standar Studio: 0 semitone / 100% tempo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Pitch Transposisi */}
            <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">Pitch Transposisi</span>
                <span className="text-xs font-mono text-zinc-300 bg-white/[0.06] px-2 py-0.5 rounded">
                  {preset.pitchDetuneCents}c ({(preset.pitchDetuneCents / 100).toFixed(1)} st)
                </span>
              </div>
              <input
                type="range"
                min={-1200}
                max={300}
                step={5}
                value={preset.pitchDetuneCents}
                onChange={(e) => handleSliderChange('pitchDetuneCents', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-[10px] text-zinc-400">
                0c (Standar Alami) / -120c (Suno Armor)
              </div>
            </div>

            {/* Tempo Warp */}
            <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">Tempo Kecepatan</span>
                <span className="text-xs font-mono text-zinc-300 bg-white/[0.06] px-2 py-0.5 rounded">
                  {preset.tempoWarpPercent || 100}%
                </span>
              </div>
              <input
                type="range"
                min={90.0}
                max={110.0}
                step={0.5}
                value={preset.tempoWarpPercent || 100}
                onChange={(e) => handleSliderChange('tempoWarpPercent', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-[10px] text-zinc-400">
                100% (Tempo Asli) / 102.5% (Evasion)
              </div>
            </div>

            {/* Trim Intro */}
            <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-zinc-400" />
                  <span>Trim Awal Intro</span>
                </span>
                <span className="text-xs font-mono text-zinc-300 bg-white/[0.06] px-2 py-0.5 rounded">
                  {preset.trimIntroSeconds || 0} s
                </span>
              </div>
              <input
                type="range"
                min={0.0}
                max={5.0}
                step={0.5}
                value={preset.trimIntroSeconds || 0}
                onChange={(e) => handleSliderChange('trimIntroSeconds', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-[10px] text-zinc-400">
                0s (Intro Utuh Asli)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-white/[0.08] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Format Output</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm active:scale-95"
        >
          <span>Lanjut ke Hak Cipta</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
