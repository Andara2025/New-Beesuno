/**
 * Audio Armor (CoSuProcessor) — Preset Specification & Metadata
 * Matches CoSuProcessor reference 100%:
 * 1. Original SideHarmoni (vocal_armor / original) -> _SideHarmoni
 * 2. Staccato Guide (pulse_armor / staccato)       -> _Staccato
 * 3. Slow Tempo Shield (warm_armor / slow_tempo)   -> _SlowTempo
 */

export type CanonicalArmorPresetId = 'vocal_armor' | 'pulse_armor' | 'warm_armor' | 'tempo_armor';

export interface ArmorPresetMeta {
  id: CanonicalArmorPresetId;
  cosuKey: 'original' | 'staccato' | 'slow_tempo' | 'tempo_flex';
  order: number;
  name: string;
  badge: string;
  accent: 'emerald' | 'amber' | 'violet' | 'sky';
  icon: string;
  desc: string;
  bestFor: string[];
  suffix: string;
  aliases: string[];
  stereoBehavior: string;
  monoDownmix: string;
  tempo: string;
  lowCutHz: number;
  tone: string;
  ffmpegFilter: string;
}

export const ARMOR_CONSTANTS = {
  PITCH_SHIFT_RATIO: 0.8908987, // 2^(-2/12) -> transpose -2 semitones
  PITCH_SHIFT_RATIO_VOCAL: 0.8908987, // 2^(-2/12) -> transpose -2 semitones
  PITCH_SHIFT: 0.8908987,
  TEMPO_VOCAL: 1.122462, // 0.8908987 * 1.122462 = 1.000x net tempo (pitch -2st, tempo restored)
  TEMPO_RESTORE: 1.122462,
  TEMPO_PULSE: 1.122462, // 0.8908987 * 1.122462 = 1.000x net tempo (pitch -2st, tempo restored)
  TEMPO_WARM: 1.178585, // 0.8908987 * 1.178585 = 1.050x net tempo (+5% speed)
  TEMPO_SLOWEST_DEFAULT: -12, // Default -12% (0.88x net tempo)
  SAMPLE_RATE: 44100,
} as const;

const PITCH_SHIFT_CORE =
  'aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.122462';

export const ARMOR_PRESETS: Record<CanonicalArmorPresetId, ArmorPresetMeta> = {
  vocal_armor: {
    id: 'vocal_armor',
    cosuKey: 'original',
    order: 1,
    name: 'Vocal Armor',
    badge: 'REKOMENDASI UTAMA',
    accent: 'emerald',
    icon: '🛡️',
    desc: 'Menghilangkan vokal utama secara bersih dan mempertahankan harmoni instrumen agar siap dijadikan referensi cover atau aransemen baru.',
    bestFor: ['Semua Genre', 'Cover Lagu', 'Pop', 'Rock', 'Akustik'],
    suffix: '_VocalArmor',
    aliases: ['original', 'default', 'procover', 'sideharmoni', 'side_harmony', 'side_harmonic', 'vocal_armor'],
    stereoBehavior: 'Isolasi Harmoni Stereo',
    monoDownmix: 'Seimbang & Aman Verifikasi',
    tempo: 'Normal (100%)',
    lowCutHz: 250,
    tone: 'Vokal bersih, harmoni instrumen tetap jernih',
    ffmpegFilter: `pan=stereo|c0=c0-c1|c1=c1-c0,highpass=f=250,${PITCH_SHIFT_CORE},volume=1.6,alimiter=limit=0.95:level=disabled:attack=5:release=50,aresample=44100:dither_method=triangular,aformat=sample_fmts=s16`,
  },
  pulse_armor: {
    id: 'pulse_armor',
    cosuKey: 'slow_tempo',
    order: 2,
    name: 'Pulse Armor',
    badge: 'PULSE & RHYTHM',
    accent: 'amber',
    icon: '⚡',
    desc: 'Efek denyut ritmis (pulse) yang kuat untuk memecah deteksi pola audio sekaligus menjaga ketukan dan energi lagu.',
    bestFor: ['Upbeat', 'Pop Modern', 'EDM', 'Rock', 'Dangdut'],
    suffix: '_PulseArmor',
    aliases: ['pulse', 'rhythmic_chop', 'pulse_armor'],
    stereoBehavior: 'Denyut Ritmis Stereo (Pulse)',
    monoDownmix: 'Seimbang & Aman Verifikasi',
    tempo: 'Adaptif (+5%)',
    lowCutHz: 160,
    tone: 'Berdenyut ritmis, bertenaga, dan dinamis',
    ffmpegFilter:
      'pan=stereo|c0=c0-c1|c1=c0-c1,highpass=f=160,bass=g=3.0:f=180,equalizer=f=1800:t=q:w=1.2:g=-11,tremolo=f=5.5:d=0.88,aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.178585,volume=2.2,alimiter=limit=0.95:level=disabled:attack=5:release=50,aresample=44100:dither_method=triangular,aformat=sample_fmts=s16',
  },
  warm_armor: {
    id: 'warm_armor',
    cosuKey: 'staccato',
    order: 3,
    name: 'Warm Armor',
    badge: 'HALUS & NATURAL',
    accent: 'violet',
    icon: '🌙',
    desc: 'Karakter suara hangat dan halus dengan panduan melodi lembut untuk lagu slow, ballad, dan akustik tanpa efek patah-patah.',
    bestFor: ['Slow Tempo', 'Ballad', 'Jazz', 'Lo-Fi', 'Akustik'],
    suffix: '_WarmArmor',
    aliases: ['slow_tempo', 'slow_ballad', 'ballad', 'slow', 'deep_acoustic', 'warm_armor', 'staccato', 'staccato_guide'],
    stereoBehavior: 'Stereo Hangat & Panduan Melodi Halus',
    monoDownmix: 'Seimbang & Aman Verifikasi',
    tempo: 'Normal (100%)',
    lowCutHz: 250,
    tone: 'Karakter hangat, lembut, dengan panduan nada vokal',
    ffmpegFilter: `aeval=exprs='val(0)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(1)|val(1)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(0)':c=stereo,highpass=f=250,${PITCH_SHIFT_CORE},volume=1.6,alimiter=limit=0.95:level=disabled:attack=5:release=50,aresample=44100:dither_method=triangular,aformat=sample_fmts=s16`,
  },
  tempo_armor: {
    id: 'tempo_armor',
    cosuKey: 'tempo_flex',
    order: 4,
    name: 'Tempo Armor',
    badge: 'VOKAL JELAS + TEMPO',
    accent: 'sky',
    icon: '⏱️',
    desc: 'Vokal lebih jelas, tebal, dan menonjol di depan dengan pengatur tempo fleksibel (Default -12% Slowest). Bisa di-slowdown atau speed-up sesuai lagu.',
    bestFor: ['Vokal Menonjol', 'Slowdown -12%', 'Speed Up', 'Semua Lagu'],
    suffix: '_TempoArmor',
    aliases: ['tempo_armor', 'tempo_flex', 'slowest', 'slowest_tempo', 'custom_tempo'],
    stereoBehavior: 'Vokal Menonjol + Kontur Tempo Fleksibel',
    monoDownmix: 'Seimbang & Aman Verifikasi',
    tempo: 'Fleksibel (Default -12%)',
    lowCutHz: 150,
    tone: 'Vokal jelas di depan, hangat, dengan kecepatan tempo fleksibel',
    ffmpegFilter: `aeval=exprs='val(0)-if(lt(mod(t\\,2.8)\\,1.75)\\,0.58\\,if(lt(mod(t\\,2.8)\\,1.80)\\,0.58+0.20*(mod(t\\,2.8)-1.75)/0.05\\,if(gt(mod(t\\,2.8)\\,2.75)\\,0.78-0.20*(mod(t\\,2.8)-2.75)/0.05\\,0.78)))*val(1)|val(1)-if(lt(mod(t\\,2.8)\\,1.75)\\,0.58\\,if(lt(mod(t\\,2.8)\\,1.80)\\,0.58+0.20*(mod(t\\,2.8)-1.75)/0.05\\,if(gt(mod(t\\,2.8)\\,2.75)\\,0.78-0.20*(mod(t\\,2.8)-2.75)/0.05\\,0.78)))*val(0)':c=stereo,highpass=f=150,equalizer=f=1350:t=q:w=1.1:g=2.8,equalizer=f=2600:t=q:w=1.0:g=4.2,aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=0.987767,volume=1.75,alimiter=limit=0.95:level=disabled:attack=5:release=50,aresample=44100:dither_method=triangular,aformat=sample_fmts=s16`,
  },
};

export const DEFAULT_ARMOR_PRESET: CanonicalArmorPresetId = 'vocal_armor';

export const ARMOR_PRESETS_LIST: ArmorPresetMeta[] = Object.values(ARMOR_PRESETS).sort(
  (a, b) => a.order - b.order
);

/**
 * Normalizes any preset string (including CoSuProcessor keys and aliases) into a canonical ID.
 */
export function normalizePreset(raw: string | undefined | null): CanonicalArmorPresetId {
  if (!raw) return DEFAULT_ARMOR_PRESET;
  const key = String(raw).trim().toLowerCase();
  if (ARMOR_PRESETS[key as CanonicalArmorPresetId]) {
    return key as CanonicalArmorPresetId;
  }
  for (const id of Object.keys(ARMOR_PRESETS) as CanonicalArmorPresetId[]) {
    if (ARMOR_PRESETS[id].cosuKey === key || ARMOR_PRESETS[id].aliases.includes(key)) {
      return id;
    }
  }
  return DEFAULT_ARMOR_PRESET;
}

/**
 * Returns metadata for a given preset ID or alias.
 */
export function getPresetMeta(raw: string | undefined | null): ArmorPresetMeta {
  return ARMOR_PRESETS[normalizePreset(raw)];
}

/**
 * Generates canonical output filename matching CoSuProcessor.generateDefaultOutputPath:
 * - Full mode: {base}{presetSuffix}_Full.{ext}
 * - Slice mode: {base}{presetSuffix}_{duration}s.{ext}
 * where presetSuffix is _SlowTempo, _Staccato, or _SideHarmoni
 */
export function buildArmorOutputFilename(
  rawTitle: string,
  rawPreset: string | undefined | null,
  isFull: boolean,
  durationSec: number,
  ext: string = 'mp3'
): string {
  let base = (rawTitle || 'Audio')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');

  if (base.length > 40) {
    base = base.substring(0, 40).replace(/_$/, '');
  }

  const meta = getPresetMeta(rawPreset);
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  if (isFull) {
    return `${base}${meta.suffix}_Full.${cleanExt}`;
  }
  const durLabel = durationSec ? `${Math.round(durationSec)}s` : '60s';
  return `${base}${meta.suffix}_${durLabel}.${cleanExt}`;
}

/**
 * Evaluates the Warm Armor pulse modulation cancellation factor k(t) at time t (in seconds)
 * Exact match for FFmpeg aeval expression:
 * if(lt(mod(t,3.0),1.35), 0.78,
 *   if(lt(mod(t,3.0),1.40), 0.78+0.22*(mod(t,3.0)-1.35)/0.05,
 *     if(gt(mod(t,3.0),2.95), 1.0-0.22*(mod(t,3.0)-2.95)/0.05, 1.0)))
 */
export function getPulseArmorK(t: number): number {
  const modT = ((t % 3.0) + 3.0) % 3.0;
  if (modT < 1.35) {
    return 0.78;
  }
  if (modT < 1.40) {
    return 0.78 + (0.22 * (modT - 1.35)) / 0.05;
  }
  if (modT > 2.95) {
    return 1.0 - (0.22 * (modT - 2.95)) / 0.05;
  }
  return 1.0;
}

/**
 * Evaluates the Tempo Armor vocal-forward cancellation factor k(t) at time t (in seconds).
 * Keeps lead vocal continuously audible (42% vocal for 1.75s, smoothly dipping to 22% vocal for 0.95s, never muting to 0%).
 * Exact match for FFmpeg aeval expression:
 * if(lt(mod(t,2.8),1.75), 0.58,
 *   if(lt(mod(t,2.8),1.80), 0.58+0.20*(mod(t,2.8)-1.75)/0.05,
 *     if(gt(mod(t,2.8),2.75), 0.78-0.20*(mod(t,2.8)-2.75)/0.05, 0.78)))
 */
export function getTempoArmorK(t: number): number {
  const modT = ((t % 2.8) + 2.8) % 2.8;
  if (modT < 1.75) {
    return 0.58;
  }
  if (modT < 1.80) {
    return 0.58 + (0.20 * (modT - 1.75)) / 0.05;
  }
  if (modT > 2.75) {
    return 0.78 - (0.20 * (modT - 2.75)) / 0.05;
  }
  return 0.78;
}
