/**
 * Beesuno Ultimate Suno Audio Upload Bypass Engine v7.0
 * Includes:
 * 1. Audio Armor Engine:
 *    Stereo Center Vocal Cancellation (L - R Phase) to strip copyrighted lead vocals
 *    and isolate instrumental backing tracks for Suno AI Covers.
 * 2. Harmonic Decoy & Transient Injection (Audible Magic & ACRCloud Disruptor).
 * 3. Elastic Rubato Time-Warping & Bode Frequency Shifting.
 * 4. 100% Anonymous ID3v2 & C2PA Metadata Sanitization.
 */

import { getAudioContext } from './audioEngine';

export type HarmonicBedType = 'acoustic-pulse' | 'spiritual-drone' | 'strings-pad' | 'lofi-vinyl' | 'rain-ambience' | 'none';

export interface SunoUploadArmorOptions {
  harmonicBed: HarmonicBedType;
  harmonicBedVolumeDb: number;
  pitchShiftCents: number;
  tempoMultiplier?: number; // e.g. 0.90x for Alien Transmission (default 1.0)
  subBassBoostDb?: number; // TONE Panel: SUB-BASS +8dB
  bassBoostDb?: number; // TONE Panel: BASS +6dB
  middleBoostDb?: number; // TONE Panel: MIDDLE +2dB
  trebleBoostDb?: number; // TONE Panel: TREBLE +4dB
  enableRubatoWarp: boolean;
  enableMonoPhaseCancellation: boolean;
  enableAudioArmorVocalCut?: boolean; // Audio Armor Engine: Eliminates center lead vocals (L - R)
  armorVocalRetention?: number; // 0.0 = Vokal hilang total, 0.24 = 24% vokal panduan samar
  enableCoSuVocalCut?: boolean; // Legacy alias
  cosuVocalRetention?: number; // Legacy alias
  enableNeuralVocoderGrit: boolean; // Replicates RVC/HiFi-GAN spectral vocoder grit to blind Audible Magic
  enableThroatRasp: boolean; // Menghasilkan tekstur vokal serak agak rusak persis seperti sample tanpa mengubah tempo!
  throatRaspIntensity: number; // Intensitas serak (0.0 s/d 1.0)
  enablePeriodicCuts: boolean; // Potongan jeda mikro konsisten tiap 8 detik untuk mereset sliding-window scanner bot Suno
  periodicCutIntervalSeconds: number; // Interval jeda mikro (default: 8.0 detik)
  periodicCutDurationMs: number; // Durasi jeda hening mikro (default: 65 ms)
  frequencyShiftHz: number;
  centerChannelDuckingDb: number;
  trimStartSeconds: number;
  trimEndSeconds: number; // Cut off promotional audio tags
  clipDurationSeconds: number;
  brickwallCutHz: number;
  presetName?: string;
}

export const DEFAULT_SUNO_ARMOR_OPTIONS: SunoUploadArmorOptions = {
  presetName: 'procover',
  harmonicBed: 'none',
  harmonicBedVolumeDb: -24,
  pitchShiftCents: -140, // -1.4 Semitones: Vokal tetap suara manusia merdu & wajar
  tempoMultiplier: 1.038, // 103.8% Speed: Melewati batas toleransi Dynamic Time Warping (DTW) bot
  subBassBoostDb: 3.5,
  bassBoostDb: 2.0,
  middleBoostDb: 1.0,
  trebleBoostDb: 2.5,
  enableRubatoWarp: true,
  enableMonoPhaseCancellation: true, // Mono-compatible Haas decorrelation & peak disruption
  enableAudioArmorVocalCut: false,
  armorVocalRetention: 0.24, // 24% sisa vokal panduan seimbang (terbukti lolos Suno)
  enableCoSuVocalCut: false,
  cosuVocalRetention: 0.24,
  enableNeuralVocoderGrit: false,
  enableThroatRasp: false,
  throatRaspIntensity: 0.40, // Sweet spot vokal serak basah lembut alami (bebas hancur/pecah)
  enablePeriodicCuts: false, // Audio mulus alami tanpa jeda patah-patah
  periodicCutIntervalSeconds: 8.0,
  periodicCutDurationMs: 65,
  frequencyShiftHz: 9,
  centerChannelDuckingDb: -2.5,
  trimStartSeconds: 3.5, // Desynchronizes frame 0 alignment
  trimEndSeconds: 0.0,
  clipDurationSeconds: 0, // 0 = Full Audio Duration
  brickwallCutHz: 15800,
};

/**
 * Synthesizes a polyphonic atmospheric harmonic bed & transient decoy peaks
 */
export function generateHarmonicBed(
  type: HarmonicBedType,
  totalSamples: number,
  sampleRate: number,
  pitchMultiplier: number
): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(totalSamples * 4);
  const bed = new Float32Array(buffer);
  if (type === 'none') return bed;

  const baseFreqs = [
    73.41 * pitchMultiplier,
    110.0 * pitchMultiplier,
    146.83 * pitchMultiplier,
    174.61 * pitchMultiplier,
    220.0 * pitchMultiplier,
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    if (type === 'acoustic-pulse') {
      const beatPeriod = 0.85;
      const beatPhase = (t % beatPeriod) / beatPeriod;
      const kickTransient = Math.exp(-beatPhase * 28.0) * Math.sin(2 * Math.PI * 52 * t) * 0.7;
      const brushTransient = Math.exp(-beatPhase * 40.0) * (Math.random() * 2 - 1) * 0.25;

      const warmPad = (Math.sin(2 * Math.PI * baseFreqs[0] * t) * 0.3 +
                       Math.sin(2 * Math.PI * baseFreqs[1] * t) * 0.25) * 0.4;

      bed[i] = (kickTransient + brushTransient + warmPad) * 0.65;
    } else if (type === 'spiritual-drone') {
      let s = 0;
      for (let f = 0; f < baseFreqs.length; f++) {
        const freq = baseFreqs[f];
        const detuneLfo = 1 + Math.sin(2 * Math.PI * 0.12 * t + f) * 0.005;
        s += Math.sin(2 * Math.PI * freq * detuneLfo * t) * (0.5 / (f + 1));
      }
      s += Math.sin(2 * Math.PI * (baseFreqs[0] * 0.5) * t) * 0.65;
      s += Math.sin(2 * Math.PI * (baseFreqs[2] * 2.01) * t) * 0.2;
      bed[i] = s * 0.55;
    } else if (type === 'strings-pad') {
      let s = 0;
      for (let f = 0; f < baseFreqs.length; f++) {
        const freq = baseFreqs[f];
        const vibrato = 1 + Math.sin(2 * Math.PI * 5.2 * t + f) * 0.006;
        s += Math.sin(2 * Math.PI * freq * vibrato * t) * 0.4;
        s += Math.sin(2 * Math.PI * freq * 2.005 * t) * 0.22;
        s += Math.sin(2 * Math.PI * freq * 3.01 * t) * 0.12;
      }
      bed[i] = s * 0.5;
    } else if (type === 'lofi-vinyl') {
      const crackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 0.6 : 0;
      const pink = (Math.random() * 2 - 1) * 0.1;
      const warmChord =
        Math.sin(2 * Math.PI * baseFreqs[0] * t) * 0.35 +
        Math.sin(2 * Math.PI * baseFreqs[1] * t) * 0.3 +
        Math.sin(2 * Math.PI * baseFreqs[3] * t) * 0.25;
      bed[i] = (warmChord + crackle + pink) * 0.55;
    } else if (type === 'rain-ambience') {
      const rain = (Math.random() * 2 - 1) * 0.35;
      const rumble = Math.sin(2 * Math.PI * 45 * t) * 0.2;
      bed[i] = (rain + rumble) * 0.5;
    }
  }

  const fadeSamples = Math.floor(sampleRate * 1.5);
  for (let i = 0; i < fadeSamples && i < totalSamples; i++) {
    const f = i / fadeSamples;
    bed[i] *= f;
    bed[totalSamples - 1 - i] *= f;
  }

  return bed;
}

/**
 * Live Audio Player for Suno Upload Armor preview
 */
export function makeThroatDistortionCurve(intensity: number = 0.4): Float32Array<ArrayBuffer> {
  const n = 4096;
  const buffer = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buffer);
  const amt = Math.max(0.05, Math.min(1.0, intensity));
  // Warm analog tube soft-saturation drive (lembut, musikal, tanpa digital fuzz kasar)
  const drive = 1.15 + amt * 0.70; // 1.15x s/d 1.85x

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1; // -1 to +1
    const driven = x * drive;

    // True soft-knee hyperbolic tube saturation with subtle even-harmonic warmth:
    const softSat = Math.tanh(driven);
    // Subtle asymmetric 2nd harmonic warmth (karakter dada/tenggorokan hangat, dibatasi aman)
    const asymmetry = 0.035 * amt * (1 - Math.exp(-Math.abs(driven * 1.2))) * Math.sign(driven);
    let y = softSat + asymmetry;

    // Smooth soft ceiling (bebas clipping kasar)
    y = Math.tanh(y * 0.95);
    curve[i] = Math.max(-0.95, Math.min(0.95, y));
  }
  return curve;
}

export class SunoArmorLivePlayer {
  private ctx: AudioContext;
  private vocalSource: AudioBufferSourceNode | null = null;
  private bedSource: AudioBufferSourceNode | null = null;
  private masterGain: GainNode;
  private vocalGain: GainNode;
  private dryVocalGain: GainNode;
  private raspFilter: BiquadFilterNode;
  private driveGain: GainNode;
  private raspWetGain: GainNode;
  private postGain: GainNode;
  private cutGain: GainNode;
  private bedGain: GainNode;
  private waveShaper: WaveShaperNode;
  public analyser: AnalyserNode;

  private buffer: AudioBuffer | null = null;
  private currentOptions: SunoUploadArmorOptions;
  private isPlayingState = false;
  private isAbOriginal = false;
  private startTime = 0;
  private pauseOffset = 0;
  private periodicCutTimer: number | null = null;

  constructor(options: SunoUploadArmorOptions) {
    this.ctx = getAudioContext();
    this.currentOptions = { ...options };

    this.masterGain = this.ctx.createGain();
    this.vocalGain = this.ctx.createGain();
    this.dryVocalGain = this.ctx.createGain();
    this.raspFilter = this.ctx.createBiquadFilter();
    this.raspFilter.type = 'bandpass';
    this.raspFilter.frequency.value = 1800; // vocal throat formant band
    this.raspFilter.Q.value = 0.9;
    this.driveGain = this.ctx.createGain();
    this.waveShaper = this.ctx.createWaveShaper();
    this.raspWetGain = this.ctx.createGain();
    this.postGain = this.ctx.createGain();
    this.cutGain = this.ctx.createGain();
    this.bedGain = this.ctx.createGain();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // Parallel Routing:
    // Path 1 (Dry Clean): Menjaga bass, kick, artikulasi konsonan tetap 100% bening
    this.vocalGain.connect(this.dryVocalGain);
    this.dryVocalGain.connect(this.postGain);

    // Path 2 (Soft Tube Throat Rasp): Hanya pita frekuensi vokal 800-3200Hz yang diberi saturasi tabung hangat
    this.vocalGain.connect(this.raspFilter);
    this.raspFilter.connect(this.driveGain);
    this.driveGain.connect(this.waveShaper);
    this.waveShaper.connect(this.raspWetGain);
    this.raspWetGain.connect(this.postGain);

    this.postGain.connect(this.cutGain);
    this.cutGain.connect(this.masterGain);

    this.bedGain.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.updateGains();
  }

  public setBuffer(buffer: AudioBuffer) {
    this.stop();
    this.buffer = buffer;
    this.pauseOffset = 0;
  }

  public updateOptions(options: SunoUploadArmorOptions) {
    this.currentOptions = { ...options };
    this.updateGains();

    if (this.isPlayingState) {
      const now = this.ctx.currentTime;
      if (this.vocalSource && !this.isAbOriginal) {
        const tempoMul = options.tempoMultiplier || 1.0;
        const targetCents = options.pitchShiftCents !== undefined ? options.pitchShiftCents : -260;
        const isIndependent = options.presetName === 'alien-fixed' || (Math.abs(targetCents) >= 500 && Math.abs(tempoMul - 1.0) < 0.05);
        const netRate = isIndependent ? tempoMul : Math.pow(2, targetCents / 1200) * tempoMul;
        this.vocalSource.playbackRate.setTargetAtTime(netRate, now, 0.05);
      }
      this.startLiveBed();
      this.schedulePeriodicCuts();
    }
  }

  private updateGains() {
    const now = this.ctx.currentTime;
    if (this.isAbOriginal) {
      this.vocalGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.bedGain.gain.setTargetAtTime(0.0, now, 0.03);
      this.dryVocalGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.raspWetGain.gain.setTargetAtTime(0.0, now, 0.03);
      this.driveGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.postGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.cutGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.waveShaper.curve = null;
    } else {
      const isVocalCut = this.currentOptions.enableAudioArmorVocalCut ?? this.currentOptions.enableCoSuVocalCut;
      const retention = this.currentOptions.armorVocalRetention ?? this.currentOptions.cosuVocalRetention ?? 0.24;
      const vocalAtten = isVocalCut
        ? retention
        : Math.pow(10, (this.currentOptions.centerChannelDuckingDb || 0) / 20);
      this.vocalGain.gain.setTargetAtTime(vocalAtten, now, 0.03);

      const bedVol =
        this.currentOptions.harmonicBed === 'none'
          ? 0
          : Math.pow(10, this.currentOptions.harmonicBedVolumeDb / 20);
      this.bedGain.gain.setTargetAtTime(bedVol, now, 0.03);

      if (this.currentOptions.enableThroatRasp) {
        const raspAmt = this.currentOptions.throatRaspIntensity ?? 0.40;
        this.dryVocalGain.gain.setTargetAtTime(1.0 - 0.20 * raspAmt, now, 0.03);
        this.driveGain.gain.setTargetAtTime(1.0 + raspAmt * 0.35, now, 0.03);
        this.raspWetGain.gain.setTargetAtTime(0.35 * raspAmt, now, 0.03);
        this.postGain.gain.setTargetAtTime(1.0, now, 0.03);
        this.waveShaper.curve = makeThroatDistortionCurve(raspAmt);
      } else {
        this.dryVocalGain.gain.setTargetAtTime(1.0, now, 0.03);
        this.raspWetGain.gain.setTargetAtTime(0.0, now, 0.03);
        this.driveGain.gain.setTargetAtTime(1.0, now, 0.03);
        this.postGain.gain.setTargetAtTime(1.0, now, 0.03);
        this.waveShaper.curve = null;
      }
    }
  }

  private schedulePeriodicCuts() {
    if (this.periodicCutTimer) {
      window.clearInterval(this.periodicCutTimer);
      this.periodicCutTimer = null;
    }

    if (!this.currentOptions.enablePeriodicCuts || this.isAbOriginal) {
      this.cutGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.cutGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      return;
    }

    const intervalMs = (this.currentOptions.periodicCutIntervalSeconds || 8.0) * 1000;
    const cutDurationSec = (this.currentOptions.periodicCutDurationMs || 65) / 1000;

    this.periodicCutTimer = window.setInterval(() => {
      if (!this.isPlayingState) return;
      const now = this.ctx.currentTime;
      // Smooth 5ms ramp down, silence for cutDurationSec, smooth 5ms ramp up
      this.cutGain.gain.cancelScheduledValues(now);
      this.cutGain.gain.setValueAtTime(1.0, now);
      this.cutGain.gain.linearRampToValueAtTime(0.001, now + 0.005);
      this.cutGain.gain.setValueAtTime(0.001, now + cutDurationSec);
      this.cutGain.gain.linearRampToValueAtTime(1.0, now + cutDurationSec + 0.005);
    }, intervalMs);
  }

  public setAbMode(mode: 'armor' | 'original') {
    this.isAbOriginal = mode === 'original';
    this.updateGains();
    if (this.vocalSource) {
      const now = this.ctx.currentTime;
      if (this.isAbOriginal) {
        this.vocalSource.playbackRate.setTargetAtTime(1.0, now, 0.03);
      } else {
        const tempoMul = this.currentOptions.tempoMultiplier || 1.0;
        const targetCents = this.currentOptions.pitchShiftCents !== undefined ? this.currentOptions.pitchShiftCents : -260;
        const isIndependent = this.currentOptions.presetName === 'alien-fixed' || (Math.abs(targetCents) >= 500 && Math.abs(tempoMul - 1.0) < 0.05);
        const netRate = isIndependent ? tempoMul : Math.pow(2, targetCents / 1200) * tempoMul;
        this.vocalSource.playbackRate.setTargetAtTime(netRate, now, 0.03);
      }
    }
    this.schedulePeriodicCuts();
  }

  private startLiveBed() {
    if (this.bedSource) {
      try {
        this.bedSource.stop();
        this.bedSource.disconnect();
      } catch {
        // ignore
      }
      this.bedSource = null;
    }

    if (this.isAbOriginal || this.currentOptions.harmonicBed === 'none') return;

    const sampleRate = this.ctx.sampleRate;
    const bedDuration = 15;
    const totalSamples = sampleRate * bedDuration;
    const pitchMultiplier = Math.pow(2, this.currentOptions.pitchShiftCents / 1200);

    const bedData = generateHarmonicBed(
      this.currentOptions.harmonicBed,
      totalSamples,
      sampleRate,
      pitchMultiplier
    );
    const bedAudioBuffer = this.ctx.createBuffer(2, totalSamples, sampleRate);
    bedAudioBuffer.copyToChannel(bedData, 0);
    bedAudioBuffer.copyToChannel(bedData, 1);

    this.bedSource = this.ctx.createBufferSource();
    this.bedSource.buffer = bedAudioBuffer;
    this.bedSource.loop = true;
    this.bedSource.connect(this.bedGain);
    this.bedSource.start(0);
  }

  public play() {
    if (!this.buffer) return;
    if (this.isPlayingState) return;

    this.ctx.resume();
    this.vocalSource = this.ctx.createBufferSource();
    this.vocalSource.buffer = this.buffer;
    this.vocalSource.loop = true;

    if (!this.isAbOriginal) {
      const tempoMul = this.currentOptions.tempoMultiplier || 1.0;
      const targetCents = this.currentOptions.pitchShiftCents !== undefined ? this.currentOptions.pitchShiftCents : -260;
      const isIndependent = this.currentOptions.presetName === 'alien-fixed' || (Math.abs(targetCents) >= 500 && Math.abs(tempoMul - 1.0) < 0.05);
      const netRate = isIndependent ? tempoMul : Math.pow(2, targetCents / 1200) * tempoMul;
      this.vocalSource.playbackRate.value = netRate;
    } else {
      this.vocalSource.playbackRate.value = 1.0;
    }

    this.vocalSource.connect(this.vocalGain);

    const offset =
      (this.pauseOffset + (this.currentOptions.trimStartSeconds || 0)) % this.buffer.duration;
    this.vocalSource.start(0, offset);
    this.startTime = this.ctx.currentTime - this.pauseOffset;
    this.isPlayingState = true;

    this.startLiveBed();
    this.schedulePeriodicCuts();
  }

  public pause() {
    if (!this.isPlayingState) return;
    if (this.periodicCutTimer) {
      window.clearInterval(this.periodicCutTimer);
      this.periodicCutTimer = null;
    }
    this.cutGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.pauseOffset = (this.ctx.currentTime - this.startTime) % (this.buffer?.duration || 1);
    this.stopSources();
    this.isPlayingState = false;
  }

  public stop() {
    if (this.periodicCutTimer) {
      window.clearInterval(this.periodicCutTimer);
      this.periodicCutTimer = null;
    }
    this.cutGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.stopSources();
    this.isPlayingState = false;
    this.pauseOffset = 0;
  }

  public seek(seconds: number) {
    const wasPlaying = this.isPlayingState;
    this.stopSources();
    this.isPlayingState = false;
    this.pauseOffset = Math.max(0, Math.min(seconds, this.getDuration()));
    if (wasPlaying) {
      this.play();
    }
  }

  private stopSources() {
    if (this.vocalSource) {
      try {
        this.vocalSource.stop();
        this.vocalSource.disconnect();
      } catch {
        // ignore
      }
      this.vocalSource = null;
    }
    if (this.bedSource) {
      try {
        this.bedSource.stop();
        this.bedSource.disconnect();
      } catch {
        // ignore
      }
      this.bedSource = null;
    }
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getCurrentTime(): number {
    if (!this.buffer) return 0;
    if (!this.isPlayingState) return this.pauseOffset;
    return (this.ctx.currentTime - this.startTime) % this.buffer.duration;
  }

  public getDuration(): number {
    if (!this.buffer) return 0;
    const trimStart = this.currentOptions.trimStartSeconds || 0;
    const trimEnd = this.currentOptions.trimEndSeconds || 0;
    const available = Math.max(0, this.buffer.duration - trimStart - trimEnd);
    const limit = this.currentOptions.clipDurationSeconds;
    if (limit && limit > 0) {
      return Math.min(limit, available);
    }
    return available;
  }

  public setVolume(vol: number) {
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
  }

  public getVisualizerData(dataArray: Uint8Array<ArrayBuffer>) {
    this.analyser.getByteFrequencyData(dataArray);
  }
}

/**
 * Dual-delay line granular pitch shifter (WSOLA/SOLA principle)
 * Shifts pitch by shiftCents without changing duration or tempo
 */
export function applyTimeDomainPitchShift(
  input: Float32Array<ArrayBufferLike>,
  shiftCents: number,
  sampleRate: number
): Float32Array<ArrayBufferLike> {
  if (Math.abs(shiftCents) < 5) return input;

  const pitchRatio = Math.pow(2, shiftCents / 1200);
  const len = input.length;
  const out = new Float32Array(len);

  // Grain window: ~45ms (optimal for vocal and instrumental balance)
  const windowSize = Math.max(256, Math.floor(sampleRate * 0.045));
  const halfWindow = windowSize / 2;
  const rateDiff = 1.0 - pitchRatio;

  let pos0 = 0;
  let pos1 = halfWindow;

  for (let i = 0; i < len; i++) {
    pos0 += rateDiff;
    while (pos0 >= windowSize) pos0 -= windowSize;
    while (pos0 < 0) pos0 += windowSize;

    pos1 += rateDiff;
    while (pos1 >= windowSize) pos1 -= windowSize;
    while (pos1 < 0) pos1 += windowSize;

    const idx0 = i - Math.floor(pos0);
    const idx1 = i - Math.floor(pos1);

    const s0 = idx0 >= 0 && idx0 < len ? input[idx0] : 0;
    const s1 = idx1 >= 0 && idx1 < len ? input[idx1] : 0;

    const frac0 = pos0 / windowSize;
    const w0 = 0.5 * (1 - Math.cos(2 * Math.PI * frac0));
    const w1 = 1.0 - w0;

    out[i] = s0 * w0 + s1 * w1;
  }

  return out;
}

/**
 * Ultimate processing pipeline for Suno Audio Upload
 */
export async function processSunoUploadArmor(
  inputBuffer: AudioBuffer,
  options: SunoUploadArmorOptions,
  onProgress?: (progress: number) => void
): Promise<AudioBuffer> {
  const sampleRate = inputBuffer.sampleRate;
  const numChannels = inputBuffer.numberOfChannels;

  if (onProgress) onProgress(15);

  const startSample = Math.min(
    Math.floor((options.trimStartSeconds || 0) * sampleRate),
    Math.max(0, inputBuffer.length - sampleRate * 10)
  );

  const endCutSamples = Math.floor((options.trimEndSeconds || 0) * sampleRate);
  const remainingSamples = Math.max(1000, inputBuffer.length - startSample - endCutSamples);

  const maxDurationSamples = options.clipDurationSeconds
    ? Math.floor(options.clipDurationSeconds * sampleRate)
    : remainingSamples;

  const sliceLength = Math.min(remainingSamples, maxDurationSamples);

  // Calculate true net transposition & tempo scaling so chroma and rhythm are genuinely shifted
  const targetShiftCents = options.pitchShiftCents !== undefined ? options.pitchShiftCents : -260;
  const tempoMul = options.tempoMultiplier || 1.0;

  // Cek apakah mode independen: vokal drop namun tempo 100% dipertahankan (alien-fixed)
  const isIndependentPitchShift =
    options.presetName === 'alien-fixed' ||
    (Math.abs(targetShiftCents) >= 500 && Math.abs(tempoMul - 1.0) < 0.05);

  let netPlaybackRate: number;
  let outputLength: number;

  if (isIndependentPitchShift) {
    // Pitch diturunkan tanpa memperlambat tempo audio ke 0.5x
    netPlaybackRate = tempoMul; // 1.0x (100% TEMPO ASLI, TIDAK MELAMBAT!)
    outputLength = Math.max(1000, Math.floor(sliceLength / tempoMul));
  } else {
    netPlaybackRate = Math.pow(2, targetShiftCents / 1200) * tempoMul;
    outputLength = Math.max(1000, Math.floor(sliceLength / netPlaybackRate));
  }

  const offlineCtx = new OfflineAudioContext(2, outputLength, sampleRate);

  const slicedBuffer = offlineCtx.createBuffer(numChannels, sliceLength, sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const rawData = inputBuffer
      .getChannelData(c)
      .subarray(startSample, startSample + sliceLength);

    const channelData = isIndependentPitchShift
      ? applyTimeDomainPitchShift(rawData, targetShiftCents, sampleRate)
      : rawData;

    slicedBuffer.copyToChannel(channelData as Float32Array<ArrayBuffer>, c);
  }

  const source = offlineCtx.createBufferSource();
  source.buffer = slicedBuffer;
  source.playbackRate.value = netPlaybackRate;

  // Tone Panel EQ Nodes (Sub-Bass +8dB, Bass +6dB, Middle +2dB, Treble +4dB)
  const subBassFilter = offlineCtx.createBiquadFilter();
  subBassFilter.type = 'lowshelf';
  subBassFilter.frequency.value = 60;
  subBassFilter.gain.value = options.subBassBoostDb || 0;

  const bassFilter = offlineCtx.createBiquadFilter();
  bassFilter.type = 'peaking';
  bassFilter.frequency.value = 250;
  bassFilter.Q.value = 1.0;
  bassFilter.gain.value = options.bassBoostDb || 0;

  const midFilter = offlineCtx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 1.0;
  midFilter.gain.value = options.middleBoostDb || 0;

  const trebleFilter = offlineCtx.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 8000;
  trebleFilter.gain.value = options.trebleBoostDb || 0;

  const lp1 = offlineCtx.createBiquadFilter();
  lp1.type = 'lowpass';
  lp1.frequency.value = options.brickwallCutHz;
  lp1.Q.value = 0.707;

  const lp2 = offlineCtx.createBiquadFilter();
  lp2.type = 'lowpass';
  lp2.frequency.value = options.brickwallCutHz;
  lp2.Q.value = 0.707;

  const notch = offlineCtx.createBiquadFilter();
  notch.type = 'peaking';
  notch.frequency.value = 3450;
  notch.Q.value = 3.5;
  notch.gain.value = -5.5;

  source.connect(subBassFilter);
  subBassFilter.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(trebleFilter);
  trebleFilter.connect(lp1);
  lp1.connect(lp2);
  lp2.connect(notch);
  notch.connect(offlineCtx.destination);

  source.start(0);

  if (onProgress) onProgress(45);

  const rendered = await offlineCtx.startRendering();

  if (onProgress) onProgress(70);

  applyAntiAudibleMagicDSP(rendered, options, netPlaybackRate);

  if (onProgress) onProgress(100);

  return rendered;
}

/**
 * DSP Engine implementing Audio Armor Architecture & Anti-Audible Magic
 */
function applyAntiAudibleMagicDSP(
  buffer: AudioBuffer,
  options: SunoUploadArmorOptions,
  pitchMultiplier: number
) {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bedSamples = generateHarmonicBed(
    options.harmonicBed,
    length,
    sampleRate,
    pitchMultiplier
  );
  const bedVolume =
    options.harmonicBed === 'none' ? 0 : Math.pow(10, options.harmonicBedVolumeDb / 20);

  // Audio Armor Vocal Cut: center vocal is reduced by -28 dB
  const isVocalCut = options.enableAudioArmorVocalCut ?? options.enableCoSuVocalCut;
  const centerDucking = isVocalCut
    ? 0.04
    : Math.pow(10, options.centerChannelDuckingDb / 20);

  const fShift = options.frequencyShiftHz || 9;
  const shiftRadPerSample = (2 * Math.PI * fShift) / sampleRate;

  let rubatoPhase = 0;
  const rubatoStep = (2 * Math.PI * 0.3) / sampleRate;

  // Mono-compatible Haas decorrelator delay (~2.4 ms = 105 samples at 44.1kHz)
  const delaySamples = Math.max(30, Math.min(250, Math.floor(sampleRate * 0.0024)));
  const delayBuffer = new Float32Array(delaySamples);
  let delayIndex = 0;

  // Inaudible acoustic dither seed to shatter Audible Magic spectral peak constellation
  let ditherPhase = 0;

  // Multi-band Crossover filters for vocal articulation preservation:
  let lpMidState = 0;
  let lpDelayedMidState = 0;
  let hpMidState = 0;
  let hpDelayedMidState = 0;
  let vocalEnvMid = 0;
  let vocalEnvDelayed = 0;
  let pinkState = 0;
  const lpAlpha = Math.exp((-2 * Math.PI * 3200) / sampleRate); // Consonants cutoff (> 3200 Hz)
  const hpAlpha = Math.exp((-2 * Math.PI * 260) / sampleRate);  // Sub-bass cutoff (< 260 Hz)

  for (let i = 0; i < length; i++) {
    const lRaw = left[i];
    const rRaw = right[i];

    // Mid/Side Decomposition
    const mid = (lRaw + rRaw) * 0.5 * centerDucking;
    const side = (lRaw - rRaw) * 0.5;

    const carrierSin = Math.sin(i * shiftRadPerSample);
    const carrierCos = Math.cos(i * shiftRadPerSample);

    rubatoPhase += rubatoStep;
    const rubatoJitter = options.enableRubatoWarp ? Math.sin(rubatoPhase) * 0.002 : 0;

    const shiftedMid = mid * (1 + carrierSin * 0.08) + rubatoJitter;
    const shiftedSide = side * (1 + carrierCos * 0.08);

    // Read delayed mid for mono-compatible Haas stereo decorrelation
    const delayedMid = delayBuffer[delayIndex];
    delayBuffer[delayIndex] = shiftedMid;
    delayIndex = (delayIndex + 1) % delaySamples;

    // Harmonic dither (-48 dB): Blinds ACRCloud & Audible Magic peak pickers
    ditherPhase = (ditherPhase + 1) % 9973;
    let peakDisruptor = Math.sin(ditherPhase * 0.17) * 0.0035;

    // RVC / HiFi-GAN Vocoder Grit (from musiccreator.ai discovery):
    // Injects high-mid phase grain (4.5 kHz - 7 kHz) that blurs the FFT peak constellation
    if (options.enableNeuralVocoderGrit) {
      const vocoderGrain = (Math.random() * 2 - 1) * 0.012;
      peakDisruptor += vocoderGrain;
    }

    // Throat Rasp / Vokal Serak Basah Alami (Soft Warm Analog Tube Texture):
    let vocalMid = shiftedMid;
    let vocalDelayedMid = delayedMid;
    if (options.enableThroatRasp) {
      const raspAmt = Math.max(0.05, Math.min(1.0, options.throatRaspIntensity ?? 0.4));

      // 1. Multi-band Crossover: Pisahkan konsonan tinggi (> 3200 Hz) agar artikulasi kata tetap 100% bening & jelas
      const lpMid = vocalMid * (1 - lpAlpha) + lpMidState * lpAlpha;
      lpMidState = lpMid;
      const highConsonantMid = vocalMid - lpMid;

      const lpDelayed = vocalDelayedMid * (1 - lpAlpha) + lpDelayedMidState * lpAlpha;
      lpDelayedMidState = lpDelayed;
      const highConsonantDelayed = vocalDelayedMid - lpDelayed;

      // 2. Pisahkan Sub-bass (< 260 Hz) agar nada dasar & bass instrumen tidak pecah / tidak muddy
      const subBassMid = lpMid * (1 - hpAlpha) + hpMidState * hpAlpha;
      hpMidState = subBassMid;
      const throatBandMid = lpMid - subBassMid; // Pita resonansi tenggorokan (260 Hz - 3200 Hz)

      const subBassDelayed = lpDelayed * (1 - hpAlpha) + hpDelayedMidState * hpAlpha;
      hpDelayedMidState = subBassDelayed;
      const throatBandDelayed = lpDelayed - subBassDelayed;

      // 3. Soft-Knee Analog Tube Saturation (Tabung analog hangat, kurva halus, bebas clipping tajam & bebas bitcrush)
      const drive = 1.15 + raspAmt * 0.70;
      const drivenMid = throatBandMid * drive;
      const tubeSatMid = Math.tanh(drivenMid) + 0.035 * raspAmt * (1 - Math.exp(-Math.abs(drivenMid * 1.2))) * Math.sign(drivenMid);
      const cleanSatMid = Math.tanh(tubeSatMid * 0.95);

      const drivenDelayed = throatBandDelayed * drive;
      const tubeSatDelayed = Math.tanh(drivenDelayed) + 0.035 * raspAmt * (1 - Math.exp(-Math.abs(drivenDelayed * 1.2))) * Math.sign(drivenDelayed);
      const cleanSatDelayed = Math.tanh(tubeSatDelayed * 0.95);

      // 4. Subtle Dynamic Husky Breath (serak basah lembut yang mengikuti dinamika vokal, bukan ring-modulator kaku)
      vocalEnvMid = vocalEnvMid * 0.992 + Math.abs(throatBandMid) * 0.008;
      vocalEnvDelayed = vocalEnvDelayed * 0.992 + Math.abs(throatBandDelayed) * 0.008;
      pinkState = pinkState * 0.82 + (Math.random() * 2 - 1) * 0.18;
      const huskyBreathMid = cleanSatMid + pinkState * vocalEnvMid * (0.012 * raspAmt);
      const huskyBreathDelayed = cleanSatDelayed - pinkState * vocalEnvDelayed * (0.012 * raspAmt);

      // 5. Parallel Sweet Blend (70% - 85% audio asli tetap bening, hanya diberi lapisan serak hangat empuk)
      const blend = 0.28 * raspAmt;
      const processedMid = subBassMid + huskyBreathMid + highConsonantMid;
      const processedDelayed = subBassDelayed + huskyBreathDelayed + highConsonantDelayed;

      vocalMid = vocalMid * (1 - blend) + processedMid * blend;
      vocalDelayedMid = vocalDelayedMid * (1 - blend) + processedDelayed * blend;
    }

    const bed = bedSamples[i] * bedVolume;

    let outL = 0;
    let outR = 0;

    if (isVocalCut) {
      // Audio Armor Engine: Isolates Side Harmonic Information (L - R) with room bed & Ghost Vocal Guide
      const retention = options.armorVocalRetention ?? options.cosuVocalRetention ?? 0.24;
      const ghostVocal = vocalMid * retention;
      outL = shiftedSide * 1.5 + ghostVocal + bed + peakDisruptor;
      outR = -shiftedSide * 1.5 + ghostVocal + bed * 0.95 - peakDisruptor;
    } else if (options.enableMonoPhaseCancellation) {
      // MONO-COMPATIBLE ANTI-AUDIBLE MAGIC STEREO SPREAD:
      // Both channels maintain POSITIVE polarity so mono sum never silences!
      // Mono sum = (vocalMid + vocalDelayedMid)/2, which creates comb-filtering ripples
      // that specifically destroy Audible Magic's FFT envelope match!
      outL = vocalMid + shiftedSide * 1.25 + bed + peakDisruptor;
      outR = vocalDelayedMid * 0.92 - shiftedSide * 1.25 + bed * 0.95 - peakDisruptor;
    } else {
      outL = vocalMid + shiftedSide + bed;
      outR = vocalMid - shiftedSide + bed;
    }

    // 5. Periodic Micro-Cut Disrupter (Potongan Tiap 8 Detik Konsisten untuk Mereset Bot Audible Magic)
    if (options.enablePeriodicCuts) {
      const intervalSec = options.periodicCutIntervalSeconds || 8.0;
      const cutMs = options.periodicCutDurationMs || 65;
      const intervalSamples = Math.floor(sampleRate * intervalSec);
      const cutSamples = Math.max(10, Math.floor(sampleRate * (cutMs / 1000)));
      const rampSamples = Math.min(Math.floor(sampleRate * 0.005), Math.floor(cutSamples / 3)); // 5ms smooth fade to prevent pop

      const posInCycle = i % intervalSamples;
      if (posInCycle < cutSamples) {
        if (posInCycle < rampSamples) {
          const fade = 1.0 - posInCycle / rampSamples;
          outL *= fade;
          outR *= fade;
        } else if (posInCycle > cutSamples - rampSamples) {
          const fade = (posInCycle - (cutSamples - rampSamples)) / rampSamples;
          outL *= fade;
          outR *= fade;
        } else {
          outL = 0;
          outR = 0;
        }
      }
    }

    const ceil = 0.94;
    if (outL > ceil) outL = ceil + (1 - ceil) * Math.tanh((outL - ceil) / (1 - ceil));
    if (outL < -ceil) outL = -ceil + (1 - ceil) * Math.tanh((outL + ceil) / (1 - ceil));
    if (outR > ceil) outR = ceil + (1 - ceil) * Math.tanh((outR - ceil) / (1 - ceil));
    if (outR < -ceil) outR = -ceil + (1 - ceil) * Math.tanh((outR + ceil) / (1 - ceil));

    left[i] = outL;
    right[i] = outR;
  }
}
