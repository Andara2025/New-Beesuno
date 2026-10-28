/**
 * Audio Armor — Preset Specification & Metadata
 * Technical specification for three canonical audio processing presets:
 * - Vocal Armor (vocal_armor)
 * - Pulse Armor (pulse_armor)
 * - Warm Armor (warm_armor)
 */

export type CanonicalArmorPresetId = 'vocal_armor' | 'pulse_armor' | 'warm_armor';

export interface ArmorPresetMeta {
  id: CanonicalArmorPresetId;
  order: number;
  name: string;
  badge: string;
  accent: 'emerald' | 'amber' | 'violet';
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
}

export const ARMOR_CONSTANTS = {
  PITCH_SHIFT_RATIO: 0.8908987, // 2^(-2/12) -> transpose -2 semitones
  PITCH_SHIFT_RATIO_VOCAL: 0.922333, // 2^(-1.4/12) -> transpose -1.4 semitones
  PITCH_SHIFT: 0.922333, // Backward compatibility
  TEMPO_VOCAL: 1.125407, // 0.922333 * 1.125407 = 1.038x net tempo (+3.8% speed breaks Audible Magic DTW matcher)
  TEMPO_RESTORE: 1.125407, // Backward compatibility
  TEMPO_PULSE: 1.122462, // 0.8908987 * 1.122462 = 1.000x net tempo (pitch restored)
  TEMPO_WARM: 1.178585, // 0.8908987 * 1.178585 = 1.050x net tempo (+5% speed untuk Warm)
  SAMPLE_RATE: 44100,
} as const;

export const ARMOR_PRESETS: Record<CanonicalArmorPresetId, ArmorPresetMeta> = {
  vocal_armor: {
    id: 'vocal_armor',
    order: 1,
    name: 'Vocal Armor (Pro Cloak)',
    badge: 'VOKAL JELAS',
    accent: 'emerald',
    icon: '🛡️',
    desc: 'Pembatalan komponen tengah stereo (c0=c0-c1 | c1=c1-c0): vokal tengah hilang total, tersisa instrumen side, Transpose -2 st, Highpass 250 Hz, tempo 1.0×, volume 1.6×',
    bestFor: ['Semua Genre', 'Vokal Solo', 'Pop', 'Akustik', 'Rock', 'Cover Melodik'],
    suffix: '_VocalArmor',
    aliases: ['original', 'default', 'procover', 'sideharmoni', 'side_harmony', 'side_harmonic'],
    stereoBehavior: 'Anti-phase stereo cancellation (c0=c0-c1 | c1=c1-c0) + Transpose -2 st',
    monoDownmix: 'Anti-phase (L-R / R-L)',
    tempo: '1.0× (1.122× Pitch Restore)',
    lowCutHz: 250,
    tone: 'Terang, tipis, vokal tengah bersih total',
  },
  pulse_armor: {
    id: 'pulse_armor',
    order: 2,
    name: 'Pulse Armor',
    badge: 'DENYUT RITMIS',
    accent: 'amber',
    icon: '⚡',
    desc: 'Dynamic aeval pulse gating 3.0s: Vokal panduan samar 22% saat pulse ON, vokal hilang total saat pulse OFF. Transpose -2 st, Highpass 250 Hz, volume 1.6×',
    bestFor: ['Upbeat', 'Pop Modern', 'EDM', 'Dangdut', 'Rock'],
    suffix: '_PulseArmor',
    aliases: ['staccato', 'staccato_guide', 'pulse', 'rhythmic_chop'],
    stereoBehavior: 'Dynamic aeval pulse gating 3.0s (k=0.78..1.00) + Transpose -2 st',
    monoDownmix: 'Aman & berdenyut dinamis (Anti-Timeout)',
    tempo: '1.0× (1.122× Pitch Restore)',
    lowCutHz: 250,
    tone: 'Berdenyut dinamis & vokal panduan samar 22%',
  },
  warm_armor: {
    id: 'warm_armor',
    order: 3,
    name: 'Warm Armor',
    badge: 'RESONANSI HANGAT',
    accent: 'violet',
    icon: '🌙',
    desc: 'Resonansi analog hangat & mono-safe: In-phase cancellation (c0=c0-c1|c1=c0-c1) bebas hilang fase di Suno, Tremolo 5.5 Hz (d=0.88), Notch 1.8 kHz (-11 dB), Bass +3 dB @ 180 Hz, Transpose -2 st, tempo 1.05×, volume 2.2×',
    bestFor: ['Ballad', 'Jazz', 'Lo-Fi', 'Akustik Santai'],
    suffix: '_WarmArmor',
    aliases: ['slow_tempo', 'slow_ballad', 'ballad', 'slow', 'deep_acoustic'],
    stereoBehavior: 'In-phase subtraction (c0=c0-c1|c1=c0-c1) + Tremolo chopper 5.5 Hz',
    monoDownmix: '100% Aman & bebas hilang fase (Anti-Timeout)',
    tempo: '1.05× (+5% tempo)',
    lowCutHz: 160,
    tone: 'Tebal, hangat, empuk, vokal tengah bersih total',
  },
};

export const DEFAULT_ARMOR_PRESET: CanonicalArmorPresetId = 'vocal_armor';

export const ARMOR_PRESETS_LIST: ArmorPresetMeta[] = Object.values(ARMOR_PRESETS).sort(
  (a, b) => a.order - b.order
);

/**
 * Normalizes any preset string (including legacy IDs and aliases) into a canonical ID.
 */
export function normalizePreset(raw: string | undefined | null): CanonicalArmorPresetId {
  if (!raw) return DEFAULT_ARMOR_PRESET;
  const key = String(raw).trim().toLowerCase();
  if (ARMOR_PRESETS[key as CanonicalArmorPresetId]) {
    return key as CanonicalArmorPresetId;
  }
  for (const id of Object.keys(ARMOR_PRESETS) as CanonicalArmorPresetId[]) {
    if (ARMOR_PRESETS[id].aliases.includes(key)) {
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
 * Generates canonical output filename matching Section 8 of the spec:
 * - Slice mode: {basename}{suffix}_{duration}s.{ext}
 * - Full mode: {basename}{suffix}_Full.{ext}
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
  const durLabel = isFull ? 'Full' : `${Math.round(durationSec)}s`;
  const cleanExt = ext.replace(/^\./, '').toLowerCase();

  return `${base}${meta.suffix}_${durLabel}.${cleanExt}`;
}

/**
 * Evaluates the pulse modulation cancellation factor k(t) at time t (in seconds)
 * Cycle: 3.0 seconds
 * 0.00 - 1.35s: k = 0.78
 * 1.35 - 1.40s: ramp from 0.78 to 1.00
 * 1.40 - 2.95s: k = 1.00
 * 2.95 - 3.00s: ramp from 1.00 to 0.78
 */
export function getPulseArmorK(t: number): number {
  const modT = ((t % 3.0) + 3.0) % 3.0;
  if (modT < 1.35) {
    return 0.78;
  }
  if (modT < 1.40) {
    return 0.78 + 0.22 * ((modT - 1.35) / 0.05);
  }
  if (modT > 2.95) {
    return 1.00 - 0.22 * ((modT - 2.95) / 0.05);
  }
  return 1.00;
}
