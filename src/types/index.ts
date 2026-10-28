export type AudioFormat = 'mp3' | 'wav24' | 'wav16' | 'flac' | 'm4a' | 'ogg';

export interface MasteringPreset {
  id: string;
  name: string;
  badge?: string;
  description: string;
  pitchDetuneCents: number; // e.g. -150 cents (-1.5 semitones breaks Audible Magic chroma matching!)
  tempoWarpPercent: number; // e.g. 105.5% (+5.5% tempo completely breaks DTW tolerance)
  monoPhaseDecorrelateMs: number; // e.g. 2.0 ms (scrambles mono-summed FFT used by Audible Magic & Content ID)
  harmonicDitherDb: number; // e.g. -54 dB (pseudo-random harmonic dither to disrupt peak picking)
  preRollShiftMs: number; // e.g. 350 ms (shifts audio alignment frame 0)
  centerChannelAttenuationDb: number; // e.g. -3.5 dB (reduces centered vocal/recitation to mask lead melody)
  analogVinylBedDb: number; // e.g. -48 dB (subtle atmospheric bed that blinds acoustic onset detectors)
  trimIntroSeconds: number; // e.g. 0 to 5 seconds trim from start to desync 0:00 matching
  antiAiVocalNotchDb: number; // e.g. -3.0 dB at 3.45 kHz
  lowMidMudScoopDb: number; // e.g. -3.8 dB at 250 Hz
  subBassBodyDb: number; // e.g. +4.0 dB at 60 Hz
  ultrasonicCutHz: number; // e.g. 15500 Hz brickwall lowpass
  airSheenHighShelfDb: number; // e.g. -3.0 dB at 16 kHz
  stereoWidthPercent: number; // e.g. 120%
  tapeWarmth: number; // e.g. 1.25 (analog softclip)
  targetLufs: number; // e.g. -14.0 or -12.6 LUFS
  acousticWatermarkKill: boolean;
}

export interface MetadataSettings {
  titleMode: 'auto' | 'custom';
  customTitle: string;
  copyrightNotice: string;
  artistName: string;
  albumName: string;
  releaseYear: string;
  coverArtUrl?: string;
  coverArtFile?: File | null;
}

export interface AudioFileItem {
  id: string;
  file: File;
  name: string;
  detectedTitle?: string;
  titleSource?: 'tag' | 'filename';
  detectedArtist?: string;
  resolvedTitle?: string;
  resultFileName?: string;
  size: number;
  duration: number;
  sampleRate: number;
  c2paDetected: boolean;
  c2paBytesStripped: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  statusMessage?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  originalAudioBuffer?: AudioBuffer;
}

export interface AudioEngineStats {
  totalRendered: number;
  hardwareAccel: string;
  c2paBytesStrippedTotal: number;
  acousticCloakerStatus: string;
}

export type CanonicalArmorPresetId = 'vocal_armor' | 'pulse_armor' | 'warm_armor' | 'tempo_armor';
export type ArmorFormat = 'mp3' | 'wav' | 'ogg';

export interface ArmorPresetInfo {
  id: CanonicalArmorPresetId;
  order: number;
  name: string;
  badge: string;
  accent: 'emerald' | 'amber' | 'violet' | 'sky';
  icon: string;
  desc: string;
  bestFor: string[];
  suffix: string;
  aliases: string[];
}
